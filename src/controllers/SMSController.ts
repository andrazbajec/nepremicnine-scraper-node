import axios from 'axios';
import { log } from '../helpers/GeneralHelper';

const SMSController = () => {
    const url = new URL(process.env.SMSAPI_URL);
    url.searchParams.set('un', process.env.SMSAPI_USERNAME);
    url.searchParams.set('ps', process.env.SMSAPI_PASSWORD);
    url.searchParams.set('from', process.env.SMSAPI_SENDER);
    url.searchParams.set('to', process.env.SMSAPI_RECIPIENT);
    url.searchParams.set('cc', process.env.SMSAPI_COUNTRY_CODE);

    const sendSMS = (message: string) => {
        url.searchParams.set('m', message);

        return axios.get(url.href);
    }

    return {
        sendSMS
    }
}

export default SMSController;
