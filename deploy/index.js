const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');

async function run() {
  try {
    const token = core.getInput('cloudflare-api-token');
    const accountId = core.getInput('cloudflare-account-id'); 
    const pattern = core.getInput('worker-name-pattern');
    
    const prNumber = process.env.GITHUB_REF_NAME || 'dev';
    const workerName = pattern.replace('{pr_number}', prNumber);
    
    core.info('Deploying worker: ' + workerName);
    
    if (fs.existsSync('wrangler.toml')) {
      const config = fs.readFileSync('wrangler.toml', 'utf8');
      const updated = config.replace(/name\s*=\s*"[^"]*"/, 'name = "' + workerName + '"');
      fs.writeFileSync('wrangler.toml', updated);
    }
    
    process.env.CLOUDFLARE_API_TOKEN = token;
    process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
    
    await exec.exec('npx', ['wrangler', 'deploy']);
    
    core.setOutput('deployment-url', 'https://' + workerName + '.workers.dev');
    core.setOutput('success', 'true');
    core.setOutput('worker-name', workerName);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
