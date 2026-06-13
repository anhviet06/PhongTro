const fs = require('fs');
const path = require('path');

async function removeLocales(context) {
   const localeDir = path.join(context.appOutDir, 'locales');
   const keepLocales = ['vi.pak', 'en-US.pak', 'en-GB.pak'];

   if (fs.existsSync(localeDir)) {
      const files = fs.readdirSync(localeDir);
      files.forEach((file) => {
         if (!keepLocales.includes(file)) {
            const filePath = path.join(localeDir, file);
            try {
               fs.unlinkSync(filePath);
            } catch (err) {
               console.error(`Không thể xóa: ${file}`, err);
            }
         }
      });
   }
}

module.exports = removeLocales;
