import dayjs from 'dayjs';
import * as fs from 'fs';

export const delay = (delayAmount: number = 1000) => {
    return new Promise(resolve => {
        setTimeout(resolve, delayAmount);
    })
}

const colorMap = {
    reset: '\x1b[0m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
}

export const log = (text: string): void => {
    text = `:cyan:[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]:reset: ${text}:reset:`;
    text += ':reset:';
    let colorlessText = text;

    for (const color in colorMap) {
        colorlessText = colorlessText.replace(new RegExp(`:${color}:`, 'g'), '');
        text = text.replace(new RegExp(`:${color}:`, 'g'), colorMap[color]);
    }

    fs.appendFile(`logs/log_${dayjs().format('YYYY_MM_DD')}.log`, `${colorlessText}\n`, err => {
        if (err) {
            console.error(err);
        }
    });

    console.log(text);
}
