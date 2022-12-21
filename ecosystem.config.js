module.exports = {
  apps : [{
    name: '3Speak Studio',
    script: 'bin/www',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
