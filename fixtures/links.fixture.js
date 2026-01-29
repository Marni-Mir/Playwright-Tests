const fs = require('fs');
const { FILE_PATHS } = require('../page_object/selectors_catalog');

const linksFixtures = {
  links: async ({}, use) => {
    const links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
    await use(links);
  },
};

module.exports = { linksFixtures };

