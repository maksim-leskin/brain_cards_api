import fs from 'node:fs/promises';

export const readFile = async pathFile => {
  const dataJSON = await fs.readFile(pathFile, 'utf-8').catch(err => {
    throw new Error(`Ошибка: ${err.message}`);
  });
  const data = JSON.parse(dataJSON);
  return data;
};
