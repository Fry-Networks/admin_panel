module.exports = {
  apps: [
    {
      name: 'admin_panel',
      script: './start-with-1password.sh',
      interpreter: '/bin/bash',
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://admin.frynetworks.com/',
        OP_SERVICE_ACCOUNT_TOKEN: process.env.OP_SERVICE_ACCOUNT_TOKEN
      }
    }
  ]
};
