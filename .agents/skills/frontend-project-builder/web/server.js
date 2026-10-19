import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3847;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', (req, res) => {
    const options = req.body;

    // Script is located at ../scripts/ relative to this server (inside web/)
    const scriptPath = path.resolve(__dirname, '../scripts/create-frontend-project.sh');

    // Target directory (resolved as path string without creating directories)
    const targetDir = options.targetDir || `Projects/${options.name || 'my-frontend-app'}`;

    const args = [scriptPath, '--target-dir', targetDir];

    // Map value-based options (e.g. --name my-app)
    const valueFlags = {
        name: '--name',
        nodeVersion: '--node-version',
        framework: '--framework',
        buildTool: '--build-tool',
        styling: '--styling',
        testing: '--testing',
        docs: '--docs',
    };

    for (const [key, flag] of Object.entries(valueFlags)) {
        if (options[key]) {
            args.push(flag, options[key]);
        }
    }

    // Map boolean options (true -> --<flag>, false -> --no-<flag>)
    const booleanFlags = {
        nvm: 'nvm',
        typescript: 'ts',
        lint: 'lint',
        stylelint: 'stylelint',
        babel: 'babel',
        material: 'material-symbols',
        i18n: 'i18n',
        agents: 'agents',
        install: 'install',
    };

    for (const [key, flag] of Object.entries(booleanFlags)) {
        if (options[key] === 'true' || options[key] === true) {
            args.push(`--${flag}`);
        } else if (options[key] === 'false' || options[key] === false) {
            args.push(`--no-${flag}`);
        }
    }

    console.log(`Executing: bash ${args.join(' ')}`);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const child = spawn('bash', args);

    child.stdout.on('data', (data) => {
        res.write(data.toString());
    });

    child.stderr.on('data', (data) => {
        res.write(data.toString());
    });

    child.on('close', (_code) => {
        res.end();
    });
});

app.listen(PORT, () => {
    console.log(`Web UI running on http://localhost:${PORT}`);
});
