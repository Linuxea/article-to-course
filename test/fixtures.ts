import type { Course } from '../src/shared/schema'

export const fixtureCourse: Course = {
  title: '什么是 HTTPS？',
  subtitle: '用 5 分钟搞懂浏览器和服务器之间的安全对话',
  accent: 'teal',
  objectives: ['说清 HTTP 和 HTTPS 的区别', '理解 TLS 握手在做什么', '记住加密、身份、完整性三大保障'],
  sections: [
    {
      id: 'intro',
      title: '先看一个生活比喻',
      subtitle: '为什么我们需要加密',
      takeaways: ['HTTP 像明信片，内容人人可见', 'HTTPS 像密封信封，只有收件人能打开；加密换来的是路上的隐私，而不是速度。'],
      screens: [
        {
          heading: '寄明信片 vs 密封信',
          blocks: [
            {
              type: 'paragraph',
              segments: [
                { type: 'text', text: '想象你要寄一张' },
                {
                  type: 'term',
                  text: '明信片',
                  definition: '内容暴露在外，邮递员和任何经手的人都能看到上面写了什么。',
                },
                {
                  type: 'text',
                  text: '给朋友。明信片的好处是方便，但代价是：从你投进邮筒的那一刻起，路上每一个经手的人——邮递员、分拣员、传达室——都能低头看清你写了什么。如果你写的是密码、银行卡号，或是只想让收件人知道的悄悄话，这份“透明”就成了大问题。而',
                },
                {
                  type: 'term',
                  text: 'HTTPS',
                  definition: 'HyperText Transfer Protocol Secure，给网页传输套上一层加密，让中间人无法读懂内容。',
                },
                {
                  type: 'text',
                  text: '做的事情，就相当于把明信片换成了一只只有收件人才能打开的密封信封：信件照常在路上传递，但谁也看不懂里面的字。',
                },
              ],
            },
            {
              type: 'paragraph',
              segments: [
                {
                  type: 'text',
                  text: '理解了这个比喻，也就理解了 HTTPS 存在的全部理由。它并不会让网络变得“更快”，也不改变数据最终要送达的目的地，它改变的只是“路上谁能看懂”。换句话说，加密解决的是隐私问题，而不是速度问题。所以下次在浏览器地址栏看到那把小锁时，你看到的其实是这只密封信封的数字版本。',
                },
              ],
            },
            {
              type: 'callout',
              variant: 'accent',
              title: '核心思想',
              body: '加密不是为了“送得更快”，而是为了“路上没人看得懂”。',
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
          heading: '浏览器和服务器的一次“握手”',
          blocks: [
            {
              type: 'paragraph',
              segments: [
                { type: 'text', text: '那么这只“密封信封”到底是怎么套上去的？答案藏在浏览器和服务器刚开始通话的那几毫秒里，这一小段对话被称为' },
                {
                  type: 'term',
                  text: '握手',
                  definition: '通信双方在正式传输数据前，先互相确认身份、商量好加密方式的准备过程。',
                },
                {
                  type: 'text',
                  text: '。握手阶段双方其实还什么正文都没发，只是忙着“对暗号”：确认对方是谁、约定一套双方都支持的加密方式、再算出一把只有它俩知道的密钥。等这些都谈妥了，真正的网页内容才会被装进密文里开始传输。',
                },
              ],
            },
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
              type: 'paragraph',
              segments: [
                {
                  type: 'text',
                  text: '把上面这段对话翻译成日常语言：浏览器先自报家门，列出自己会用哪些加密算法；服务器回应一份“身份证”（证书）和一把公开的钥匙；浏览器验证完身份证是真的，才放心地和对方约定一把共同密钥。整个过程的精妙之处在于——即便有人全程偷听这段对话，也推算不出那把最终用来加解密的密钥。',
                },
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
            {
              type: 'paragraph',
              segments: [
                {
                  type: 'text',
                  text: '从图中可以看到，前两步还都是在“明文世界”里进行的（请求连接、返回证书），真正发生质变的是第三步：双方协商出对称密钥之后，通信才进入加密通道。也就是说，握手是一个“从明到密”的过渡过程——一旦跨过这道门槛，后面的所有数据对中间人来说就只剩乱码了。',
                },
              ],
            },
          ],
        },
        {
          heading: '把原文翻译成大白话',
          blocks: [
            {
              type: 'paragraph',
              segments: [
                {
                  type: 'text',
                  text: '如果觉得上面的描述还是太技术，下面把同一段 HTTPS 请求“原汁原味”的专业写法和“说人话”的版本并排放在一起对比。左边是浏览器和服务器真实交换的内容，右边是它每一行到底在表达什么。对照着看，你会发现那些吓人的英文术语，其实都在讲很朴素的事情。',
                },
              ],
            },
            {
              type: 'translation',
              original: ['GET /index.html HTTP/1.1', 'Host: example.com', 'TLS 1.3 handshake...'],
              plain: [
                '浏览器说：“把首页给我。”',
                '并告诉对方我要访问的网站是哪个。',
                '然后在加密通道里完成身份核对与密钥协商。',
              ],
            },
            {
              type: 'steps',
              items: [
                { title: '客户端发起', body: '浏览器说“你好”，附上自己支持的加密算法。' },
                { title: '服务器回应', body: '服务器出示证书，证明“我真的是 example.com”。' },
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
              type: 'paragraph',
              segments: [
                {
                  type: 'text',
                  text: '到这里，HTTPS 的核心机制已经讲完了。在收尾之前，我们用三种不同的视角把同样的知识再巩固一遍：先用三张卡片提炼它提供的三大保障，再用一张表横向对比 HTTP 与 HTTPS 的差异，最后用一张组成图看清整套机制里都有谁在分工协作。每一块都指向同一个结论——HTTPS = 加密 + 身份 + 完整性。',
                },
              ],
            },
            {
              type: 'keypoints',
              items: [
                { title: '加密', body: '让中间人即使截获数据，也只看到一堆无法读懂的乱码，从而保护内容隐私。', icon: '🔒' },
                { title: '身份验证', body: '通过数字证书保证你连到的是真正的网站，而不是中间人伪造的冒牌服务器。', icon: '🪪' },
                { title: '完整性', body: '一旦传输内容被篡改，接收方会立刻发现并丢弃，防止数据被悄悄改写。', icon: '✅' },
              ],
            },
            {
              type: 'paragraph',
              segments: [
                {
                  type: 'text',
                  text: '把这三大保障放进一张对比表里，HTTP 和 HTTPS 的差距会显得格外直观。你会看到：从内容是否可读、到有没有身份背书、再到默认端口，几乎每一项都在说明同一件事——HTTPS 多出来的那个“S”，承担了全部的安全成本。',
                },
              ],
            },
            {
              type: 'table',
              caption: 'HTTP 与 HTTPS 对比',
              columns: ['维度', 'HTTP', 'HTTPS'],
              rows: [
                ['内容可见性', '明文，人人可读', '加密，中间人看不懂'],
                ['身份验证', '无', '数字证书背书'],
                ['默认端口', '80', '443'],
              ],
            },
            {
              type: 'arch',
              nodes: [
                { id: 'browser', label: '浏览器', icon: '🖥️', desc: '发起请求的一方，负责验证证书、加密和解密数据。' },
                { id: 'tls', label: 'TLS 加密层', icon: '🔐', desc: '夹在中间的保镖，把明文变成乱码再传输。' },
                { id: 'server', label: '服务器', icon: '🗄️', desc: '持有证书和私钥，证明身份后接收加密请求。' },
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
              explanationWrong: '想想“身份证明”——速度快慢或 IP 外观都不能证明身份。',
            },
          ],
        },
      ],
    },
  ],
}
