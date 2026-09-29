import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/prisma';

export const googleAuth = (req: Request, res: Response) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.google.clientId}&redirect_uri=${config.google.redirectUri}&response_type=code&scope=profile email`;
  res.redirect(url);
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query;
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code: code as string,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    let user = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          avatar: userData.picture,
          googleId: userData.id,
        },
      });
      // Create default sender
      await prisma.sender.create({
        data: { userId: user.id, email: userData.email }
      });
    }

    const token = jwt.sign({ id: user.id }, config.jwt.secret, { expiresIn: '7d' });

    res.redirect(`${config.frontendUrl}/login?token=${token}`);
  } catch (error) {
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: { id: true, email: true, name: true, avatar: true, slackWebhookUrl: true }
    });
    res.json({ success: true, data: { ...user, slackConnected: !!user?.slackWebhookUrl } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
