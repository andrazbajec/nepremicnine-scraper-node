import nodeMailer from 'nodemailer';
import { log } from '../helpers/GeneralHelper';

const MailController = () => {
    const transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_SENDER,
            pass: process.env.GMAIL_PASSWORD,
        }
    });

    const mailConfig = {
        from: process.env.GMAIL_SENDER,
        subject: 'Found new ads',
        to: process.env.GMAIL_RECIPIENTS.split(';'),
        text: '',
    }

    const sendMail = (message: string) => {
        mailConfig.text = message;

        transporter.sendMail(mailConfig, (error, info) => {
            if (error) {
                console.log({
                    service: 'gmail',
                    auth: {
                        user: process.env.GMAIL_SENDER,
                        pass: process.env.GMAIL_PASSWORD,
                    }
                });
                console.log(error);
                log(':red:Email could not be sent!');
                return;
            }

            log(':green:Email successfully sent!')
        });
    }

    return { sendMail }
}

export default MailController;