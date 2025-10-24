# logging_config.py
import logging
import sys

# 1. 创建 (或获取) 一个 logger 对象
# 如果您在多个模块中使用相同的名称，logging.getLogger() 会返回同一个 logger 实例。
logger = logging.getLogger('my_application_logger') # 您可以自定义名称，例如项目名

# 2. 设置该 logger 的全局最低日志级别
# 只有等于或高于这个级别的日志才会被处理。
# DEBUG < INFO < WARNING < ERROR < CRITICAL
logger.setLevel(logging.DEBUG) # 设置为 DEBUG 可以捕获所有级别的日志，具体显示由 Handler 控制

# 3. 创建一个控制台处理器 (StreamHandler)，用于将日志输出到标准输出 (控制台)
console_handler = logging.StreamHandler(sys.stdout)

# 4. 设置控制台处理器的日志级别
# 这个处理器只会处理等于或高于此级别的日志。
# 例如，即使 logger.setLevel(logging.DEBUG)，如果 console_handler.setLevel(logging.INFO)，
# 那么 DEBUG 级别的日志仍然不会通过这个 handler 输出到控制台。
console_handler.setLevel(logging.INFO) # 设置为 INFO，这样 .info(), .warning(), .error(), .critical() 都会显示

# 5. 创建一个日志格式器 (Formatter)
# 定义日志输出的格式
# %(asctime)s: 日志记录的时间
# %(name)s: logger 的名称 (这里是 'my_application_logger')
# %(levelname)s: 日志级别 (e.g., INFO, WARNING)
# %(message)s: 实际的日志消息
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                              datefmt='%Y-%m-%d %H:%M:%S')

# 6. 将格式器应用到控制台处理器
console_handler.setFormatter(formatter)

# 7. 将控制台处理器添加到 logger 对象
# 检查是否已经有处理器，避免重复添加 (尤其是在某些框架或多次调用配置的场景下)
if not logger.handlers:
    logger.addHandler(console_handler)

# (可选) 如果不希望日志消息被传递给根 logger 的处理器 (如果根 logger 有配置)
# logger.propagate = False

# 方便其他模块直接导入这个配置好的 logger 实例
# 在其他文件中: from logging_config import logger
# logger.info("这是一条测试信息")
