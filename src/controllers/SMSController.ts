import axios from 'axios';
import { log } from "../helpers/GeneralHelper";

const SMSController = () => {
    let url;
    const shouldSend = process.env.SMSAPI_SHOULD_SEND === 'true';

    if (shouldSend) {
        url = new URL(process.env.SMSAPI_URL);

        url.searchParams.set('un', process.env.SMSAPI_USERNAME);
        url.searchParams.set('ps', process.env.SMSAPI_PASSWORD);
        url.searchParams.set('from', process.env.SMSAPI_SENDER);
        url.searchParams.set('to', process.env.SMSAPI_RECIPIENT);
        url.searchParams.set('cc', process.env.SMSAPI_COUNTRY_CODE);
    }

    const sendSMS = (message: string) => {
        if (!shouldSend) {
            log(':yellow:Skipping sending SMS');
            return;
        }

        url.searchParams.set('m', message);

        return axios.get(url.href);
    }

    return {
        sendSMS
    }
}

export default SMSController;
