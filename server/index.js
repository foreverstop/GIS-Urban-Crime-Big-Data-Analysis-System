import express from 'express';
import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const { Pool } = pkg;
const app = express();

// 中间件
app.use(express.json());
app.use(cors());

// 临时测试
process.env.DATABASE_URL = 'postgres://postgres:123456@localhost:5432/vue';
process.env.JWT_SECRET = '3jK8Tfj5Lm2Wq9Zb1Xr6Gp4Nv7Qt8Bk3Yt2Rn5Lm';

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 注册API
app.post('/register', async (req, res) => {
  console.log('\n=== 注册请求开始 ===');
  try {
    console.log('请求数据:', {
      account: req.body.account,
      email: req.body.email,
      password: '******' // 隐藏真实密码
    });

    // 基础验证
    if (!req.body.account || !req.body.email || !req.body.password) {
      console.log('验证失败: 缺少必要字段');
      return res.status(400).json({ error: '所有字段都是必填的' });
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      console.log('验证失败: 邮箱格式无效');
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 检查账号是否已存在
    console.log('正在检查账号是否已存在...');
    const existCheck = await pool.query(
      'SELECT id FROM users WHERE account = $1 OR email = $2',
      [req.body.account, req.body.email]
    );
    console.log('数据库查询结果:', existCheck.rows);

    if (existCheck.rows.length > 0) {
      console.log('注册失败: 用户已存在');
      return res.status(409).json({ error: '账号或邮箱已被注册' });
    }

    // 密码哈希处理
    console.log('正在进行密码哈希...');
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    console.log('密码哈希完成');

    // 创建用户
    console.log('正在创建用户...');
    const result = await pool.query(
      `INSERT INTO users (account, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, account, email`,
      [req.body.account, req.body.email, hashedPassword]
    );
    console.log('用户创建成功:', result.rows[0]);

    // 生成JWT令牌
    console.log('正在生成JWT令牌...');
    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('令牌生成成功');

    console.log('=== 注册成功 ===');
    res.status(201).json({
      ...result.rows[0],
      token
    });
  } catch (err) {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    console.log('=== 注册请求结束 ===\n');
  }
});

// 登录API
app.post('/login', async (req, res) => {
  console.log('\n=== 登录请求开始 ===');
  try {
    console.log('请求数据:', {
      account: req.body.account,
      password: '******'
    });

    if (!req.body.account || !req.body.password) {
      console.log('验证失败: 缺少账号或密码');
      return res.status(400).json({ error: '账号和密码是必填的' });
    }

    // 查询用户
    console.log('正在查询用户...');
    const result = await pool.query(
      'SELECT id, account, email, password FROM users WHERE account = $1',
      [req.body.account]
    );
    console.log('用户查询结果:', result.rows[0] ? '找到用户' : '用户不存在');

    if (result.rows.length === 0) {
      console.log('登录失败: 用户不存在');
      return res.status(401).json({ error: '账号或密码不正确' });
    }

    const user = result.rows[0];

    // 验证密码
    console.log('正在验证密码...');
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    console.log('密码验证结果:', isMatch ? '匹配' : '不匹配');

    if (!isMatch) {
      console.log('登录失败: 密码错误');
      return res.status(401).json({ error: '账号或密码不正确' });
    }

    // 生成JWT令牌
    console.log('正在生成JWT令牌...');
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('令牌生成成功');

    console.log('=== 登录成功 ===');
    res.json({
      id: user.id,
      account: user.account,
      email: user.email,
      token
    });
  } catch (err) {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    console.log('=== 登录请求结束 ===\n');
  }
});

// 受保护的路由示例
app.get('/profile', authenticateToken, async (req, res) => {
  console.log('\n=== 用户信息请求开始 ===');
  try {
    console.log('用户ID:', req.user.userId);
    const result = await pool.query(
      'SELECT id, account, email FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      console.log('用户不存在');
      return res.status(404).json({ error: '用户不存在' });
    }
    
    console.log('=== 用户信息获取成功 ===');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    console.log('=== 用户信息请求结束 ===\n');
  }
});

// JWT验证中间件
function authenticateToken(req, res, next) {
  console.log('\n[中间件] 开始验证Token');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('验证失败: 未提供Token');
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('验证失败: Token无效');
      return res.status(403).json({ error: '无效或过期的令牌' });
    }
    console.log('Token验证成功, 用户ID:', user.userId);
    req.user = user;
    next();
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n=== 服务器启动成功 ===`);
  console.log(`运行端口: ${PORT}`);
  console.log(`数据库连接: ${process.env.DATABASE_URL ? '已配置' : '未配置'}`);
  console.log(`JWT密钥: ${process.env.JWT_SECRET ? '已设置' : '未设置'}`);
  console.log(`环境模式: ${process.env.NODE_ENV || 'development'}`);
  console.log('=====================\n');
});