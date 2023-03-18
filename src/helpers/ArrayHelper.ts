export const getObjectKeyValues = (array: Array<any>, key: string) => {
    return array.map(element => element[key] ?? null)
        .filter((value, index, self) => self.indexOf(value) === index);
}
