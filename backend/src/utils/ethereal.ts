import nodemailer from 'nodemailer';
import prisma from '../config/prisma';

export const getTransporterForSender = async (senderId: string) => {
  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) throw new Error(`Sender ${senderId} not found`);

  let user = sender.etherealUser;
  let pass = sender.etherealPass;

  // Create Ethereal account if not exists
  if (!user || !pass) {
    console.log(`[Ethereal] Creating new test account for sender ${senderId}...`);
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;

    await prisma.sender.update({
      where: { id: senderId },
      data: { etherealUser: user, etherealPass: pass },
    });
    console.log(`[Ethereal] Test account created: ${user}`);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });

  return { transporter, user };
};
