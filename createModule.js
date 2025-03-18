const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});
const fs = require('fs');
const path = require('path');

const parentDirectories = {
    1: 'parents',
    2: 'drivers',
    3: 'managements',
};

function getParentDirectoryName(choice) {
    return parentDirectories[choice] || null;
}

function promptForParentDirectory() {
    return new Promise((resolve) => {
        console.log('Choose parent directory:');
        console.log('1. parents');
        console.log('2. drivers');
        console.log('3. managements');

        readline.question('Enter your choice (1, 2, or 3): ', (choice) => {
            const parentDirName = getParentDirectoryName(choice);
            if (parentDirName) {
                resolve(parentDirName);
            } else {
                console.log('Invalid choice. Please try again.');
                resolve(promptForParentDirectory()); // Recursive call for retry
            }
        });
    });
}

async function createModule() {
    const parentDirName = await promptForParentDirectory();

    readline.question('Enter the module name: ', (moduleName) => {
        const basePath = path.join('src', 'app', parentDirName, moduleName);

        fs.mkdirSync(path.join(basePath, 'models'), { recursive: true });
        fs.mkdirSync(path.join(basePath, 'routes'), { recursive: true });
        fs.mkdirSync(path.join(basePath, 'services'), { recursive: true });

        fs.writeFileSync(
            path.join(basePath, 'models', `${moduleName}Model.js`),
            `// ${moduleName} Model\n\nmodule.exports = {};\n`
        );
        fs.writeFileSync(
            path.join(basePath, 'routes', `${moduleName}Routes.js`),
            `// ${moduleName} Routes\n\nconst express = require('express');\nconst router = express.Router();\n\nmodule.exports = router;\n`
        );
        fs.writeFileSync(
            path.join(basePath, 'services', `${moduleName}Service.js`),
            `// ${moduleName} Service\n\nmodule.exports = {};\n`
        );

        console.log(`Module "${moduleName}" created successfully in "${parentDirName}"!`);
        readline.close();
    });
}

createModule();