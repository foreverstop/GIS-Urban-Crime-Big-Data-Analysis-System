// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', // 替换为你的数据库用户名
  host: 'localhost',    // 数据库主机地址
  database: 'vue', // 替换为你的数据库名
  password: '123456', // 替换为你的数据库密码
  port: 5432,           // 数据库端口号
});

module.exports = pool;
