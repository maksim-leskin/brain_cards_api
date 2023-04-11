import fs from 'node:fs/promises';

export const writeFile = async (pathFile, data) => {
  await fs.writeFile(pathFile, JSON.stringify(data), 'utf-8').catch(err => {
    throw new Error(`Ошибка: ${err.message}`);
  });
  return true;
};
