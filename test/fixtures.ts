import type { Course } from '../src/shared/schema'

export const fixtureCourse: Course = {
  title: '什么是 HTTPS？',
  subtitle: '用 5 分钟搞懂浏览器和服务器之间的安全对话',
  accent: 'teal',
  sections: [
    {
      id: 'intro',
      title: '先看一个生活比喻',
      subtitle: '为什么我们需要加密',
      screens: [
        {
          heading: '寄明信片 vs 密封信',
          blocks: [
            {
              type: 'paragraph',
              segments: [
                { type: 'text', text: '想象你寄一张' },
                {
                  type: 'term',
                  text: '明信片',
                  definition: '内容暴露在外，邮递员和任何经手的人都能看到上面写了什么。',
                },
                { type: 'text', text: '：路上任何人都能偷看。而' },
                {
                  type: 'term',
                  text: 'HTTPS',
                  definition: 'HyperText Transfer Protocol Secure，给网页传输套上一层加密，让中间人无法读懂内容。',
                },
                { type: 'text', text: '就像把内容装进只有收件人能打开的密封信封。' },
              ],
            },
            {
              type: 'callout',
              variant: 'accent',
              title: '核心思想',
              body: '加密不是为了"送得更快"，而是为了"路上没人看得懂"。',
            },
          ],
        },
      ],
    },
    {
      id: 'how',
      title: '一次 HTTPS 连接发生了什么',
      screens: [
        {
          heading: '浏览器和服务器的一次"握手"',
          blocks: [
            {
              type: 'chat',
              actors: [
                { id: 'browser', name: '浏览器', colorIndex: 1 },
                { id: 'server', name: '服务器', colorIndex: 2 },
              ],
              messages: [
                { actorId: 'browser', text: '你好，我想和你安全地说话，这是我能支持的加密方式。' },
                { actorId: 'server', text: '好的，这是我的证书和公钥，请用它来协商密钥。' },
                { actorId: 'browser', text: '我验证了你的证书，可信。我们用这个对称密钥通信吧。' },
              ],
            },
            {
              type: 'flow',
              actors: [{ label: '浏览器' }, { label: '服务器' }, { label: '加密通道' }],
              steps: [
                { from: 1, to: 2, label: '浏览器请求建立连接', packet: true },
                { from: 2, to: 1, label: '服务器返回证书', packet: true },
                { from: 1, to: 3, label: '协商出对称密钥，开始加密通信', packet: true },
              ],
            },
          ],
        },
        {
          heading: '把原文翻译成大白话',
          blocks: [
            {
              type: 'translation',
              original: ['GET /index.html HTTP/1.1', 'Host: example.com', 'TLS 1.3 handshake...'],
              plain: [
                '浏览器说："把首页给我。"',
                '并告诉对方我要访问的网站是哪个。',
                '然后在加密通道里完成身份核对与密钥协商。',
              ],
            },
            {
              type: 'steps',
              items: [
                { title: '客户端发起', body: '浏览器说"你好"，附上自己支持的加密算法。' },
                { title: '服务器回应', body: '服务器出示证书，证明"我真的是 example.com"。' },
                { title: '协商密钥', body: '双方算出一个共同的对称密钥，后续用它加解密。' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'check',
      title: '检验一下你的理解',
      screens: [
        {
          blocks: [
            {
              type: 'keypoints',
              items: [
                { title: '加密', body: '让中间人看不懂传输的内容。', icon: '🔒' },
                { title: '身份验证', body: '证书保证你没连到假冒服务器。', icon: '🪪' },
                { title: '完整性', body: '内容被篡改会被立刻发现。', icon: '✅' },
              ],
            },
            {
              type: 'quiz',
              question: '在 HTTPS 中，浏览器主要靠什么来确认对方是真正的网站？',
              options: [
                { value: 'option-a', text: '对方的 IP 地址看起来很正规' },
                { value: 'option-b', text: '对方出示的数字证书' },
                { value: 'option-c', text: '页面加载速度很快' },
              ],
              correct: 'option-b',
              explanationRight: '没错，数字证书由受信任的机构签发，用来证明服务器身份。',
              explanationWrong: '想想"身份证明"——速度快慢或 IP 外观都不能证明身份。',
            },
          ],
        },
      ],
    },
  ],
}
