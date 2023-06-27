import mysql2 from 'mysql2';
import { log } from '../helpers/GeneralHelper';
import { CapitalizeFirst } from '../helpers/StringHelper';

const DatabaseController = () => {
    const db = mysql2.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_SCHEMA,
    });

    const buildWhere = (conditions: any) => {
        let whereSql = '';
        const whereParams = [];

        for (const column in conditions) {
            const columnData = conditions[column];

            if (whereSql) {
                whereSql += ' and ';
            } else {
                whereSql += 'where '
            }

            whereSql += `\`${column}\` `;

            if (typeof columnData === 'string') {
                whereSql += '= ?';
                whereParams.push(columnData);
                continue;
            }

            const type = columnData?.type;

            if (type === 'in') {
                const inElements = columnData?.values ?? [];
                whereSql += `in (${Array((inElements).length).fill('?').join(', ')})`;

                for (const inElement of inElements) {
                    whereParams.push(inElement);
                }
            }
        }

        return { whereSql, whereParams };
    }

    const testConnection = () => {
        return new Promise(resolve => {
            db.connect(resolve);
        });
    }

    const query = (sql: string, params: Array<any> = []) => {
        return new Promise(resolve => {
            db.query(sql, params, (error, results, fields) => {
                if (error) {
                    log(`:red:DB MySQL error: :yellow:${error}`, { error, params, sql });
                    resolve(false);
                }

                resolve({ results, fields });
            });
        });
    }

    const select = (table: string, columns: Array<string> = [], conditions: any = {}) => {
        const { whereSql, whereParams } = buildWhere(conditions);

        const sql = `
            select ${columns.length ? columns.map(column => `\`${column}\``).join(', ') : '*'}
            from \`${table}\` ${whereSql};
        `;

        return query(sql, whereParams);
    }

    const insert = (table: string, data: Array<any>, { capitalizeFirst = false } = {}) => {
        const columns = Object.keys(data[0] ?? {});
        const valuesArray = [];

        if (!columns.length) {
            return;
        }

        for (const row of data) {
            for (const column of columns) {
                valuesArray.push(row[column] ?? '');
            }
        }

        const valuesString = Array(data.length).fill(Array(columns.length)
            .fill('?')
            .join(', '))
            .map(value => `(${value})`)
            .join(', ');

        const sql = `
            insert into \`${table}\`(${columns.map(column => `\`${capitalizeFirst ? CapitalizeFirst(column) : column}\``).join(', ')})
            values ${valuesString};
        `;

        return query(sql, valuesArray);
    }

    const update = (table: string, data: any, conditions: any) => {
        const { whereSql, whereParams } = buildWhere(conditions);
        const setParams = [];
        let setSql = '';

        for (const column in data) {
            const value = data[column];

            if (!value) {
                continue;
            }

            if (setSql.length) {
                setSql += ', ';
            }

            setSql += `\`${column}\` = ?`;
            setParams.push(value);
        }

        const sql = `
            update \`${table}\`
            set ${setSql} ${whereSql};
        `;

        return query(sql, [...setParams, ...whereParams]);
    }

    const truncate = (table: string) => {
        const sql = `truncate table \`${table}\`;`;

        return query(sql);
    }

    return {
        insert,
        select,
        testConnection,
        truncate,
        update,
    };
}

export default DatabaseController;
