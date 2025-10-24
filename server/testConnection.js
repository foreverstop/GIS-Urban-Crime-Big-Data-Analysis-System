//验证是否连接数据库

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', // 或者您的数据库主机地址
  database: 'vue',
  password: '123456',
  port: 5432, // 默认的 PostgreSQL 端口
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to the PostgreSQL database successfully!');
    client.release();
  } catch (err) {
    console.error('Connection error:', err.stack);
  }
};

testConnection();

