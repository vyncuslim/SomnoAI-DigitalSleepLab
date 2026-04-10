export const BLOG_POSTS = [
  {
    id: '1',
    slug: 'sleep-science-101',
    title: 'Understanding Sleep Cycles',
    excerpt: 'A deep dive into REM, Deep, and Light sleep stages and why they matter.',
    content: 'Full content here...',
    date: '2024-03-01',
    category: 'Science',
    author: {
      name: 'Dr. Sleep',
      role: 'Researcher',
      bio: 'Expert in circadian rhythms.'
    },
    tags: ['Science', 'Health'],
    readTime: '5 min'
  },
  {
    id: '2',
    slug: 'ai-in-sleep',
    title: 'How AI Analyzes Your Rest',
    excerpt: 'Exploring the algorithms behind Digital Sleep Lab\'s insights.',
    content: 'Full content here...',
    date: '2024-03-10',
    category: 'Technology',
    author: {
      name: 'Tech Team',
      role: 'Engineering',
      bio: 'Building the future of sleep tech.'
    },
    tags: ['AI', 'Tech'],
    readTime: '7 min'
  },
  {
    id: '3',
    slug: 'two-factor-authentication-guide',
    title: '制作网站双重身份验证 (2FA) 指南',
    excerpt: '了解如何实现基于时间的一次性密码 (TOTP) 的双重身份验证，提升账户安全。',
    content: `制作网站双重身份验证 (2FA) 通常涉及在用户登录密码（知识因素）基础上，增加基于时间的一次性密码 (TOTP)（持有因素）。最常用的方法是使用 Google Authenticator 或 Authy 等应用扫描二维码，生成6位验证码，后端通过密钥库（如ESET HOME）同步校验。 

### 2FA 设置/开发流程 
* **用户注册/登录**：用户使用账号和密码登录。
* **触发2FA设置**：在账户安全设置中，用户选择开启“双重身份验证”。
* **生成并显示二维码**：网站后端生成一个唯一的秘密密钥（Secret Key），将其转换成二维码供用户使用 Google Authenticator 或 Authy 应用程序扫描。
* **验证2FA设置**：用户输入应用上显示的6位验证码，后端确认密钥已绑定。
* **生成恢复代码**：提供一次性备份代码（Backup Codes），以防用户丢失设备。 

### 技术实现方式
* **使用库/SDK**：后端可使用专门的库，如 otplib (Node.js) 或 PyOTP (Python)，来生成和验证 TOTP。
* **短信/邮件验证**：虽然比应用验证慢，但也可以使用短信服务发送6位数字代码。
* **硬件密钥**：如使用 U2F 或 FIDO2 标准的 安全密钥。 

### 关键安全要求
* **保存密钥**：网站必须安全地存储用户的2FA密钥，防止泄露。
* **同步时间**：基于时间的算法需要服务器和移动设备时间一致。 

在配置完成后，用户在登录和进行敏感操作时，就必须输入6位代码。`,
    date: new Date().toISOString().split('T')[0],
    category: 'Security',
    author: {
      name: 'Security Team',
      role: 'Engineering',
      bio: 'Protecting user data and privacy.'
    },
    tags: ['Security', '2FA', 'Authentication'],
    readTime: '4 min'
  }
];

export const RESEARCH_ARTICLES = [
  {
    id: 'bug-bounty-program',
    slug: 'bug-bounty-program',
    title: 'Breaking & Securing AI Systems: White Hat Bug Bounty Session',
    excerpt: 'Join our security program event. Help us identify vulnerabilities, strengthen infrastructure, and co-build a safer AI ecosystem.',
    content: `In today’s AI-driven world, security is not optional — it is foundational.

SomnoAI Digital Sleep Lab is opening its system to ethical hackers, security researchers, and builders to help identify vulnerabilities, strengthen infrastructure, and co-build a safer AI ecosystem.

This event introduces our White Hat Bug Bounty Program, designed to reward responsible disclosure and build a trusted security community.

### 🛡️ What This Session Covers
- Introduction to SomnoAI Digital Sleep Lab system architecture (public scope)
- Bug Bounty Program structure & rules
- What vulnerabilities we are looking for
- Responsible disclosure process
- Rewards, recognition & Hall of Fame system
- Live examples of common security flaws (API / Auth / Logic)

### 🎯 Program Focus Areas
We are particularly interested in:
- **API vulnerabilities** (authentication bypass, data exposure)
- **Broken access control**
- **Logic flaws** in AI workflows
- **Misconfigurations** in cloud infrastructure
- **Rate limiting** & abuse scenarios

### 🧪 Example Targets (Public Scope)
- \`/api/*\` endpoints
- Authentication & session handling
- Public-facing dashboards
- AI request pipelines

### 🏆 Rewards & Recognition
Instead of traditional payouts, we are building a long-term security ecosystem:
- 🥇 **Hall of Fame recognition** (public profile listing)
- 🎖️ **Verified Security Researcher badge**
- 📜 **Digital certificates** (Top Contributor / Critical Finder)
- 🚀 **Early access** to internal tools & systems
- 💼 **Potential collaboration opportunities**

### ⚠️ Rules (Very Important)
- Only test within defined scope
- No data destruction or service disruption
- No exploitation of user data
- Responsible disclosure required

*Violations will result in disqualification.*

### 👥 Who Should Join
- White hat hackers
- Cybersecurity students
- Bug bounty hunters
- Developers interested in security
- Anyone curious about ethical hacking

### 🔥 Strategic Positioning
This is not just a bug bounty. It is the beginning of a security-first AI ecosystem.

### 🎤 Speakers
**Vyncus Lim**
Founder, SomnoAI Digital Sleep Lab

---
[Submit a Report](/security/bug-bounty)  |  [View Hall of Fame](/security/hall-of-fame)`,
    date: new Date().toISOString().split('T')[0],
    category: 'Event',
    author: {
      name: 'Vyncus Lim',
      role: 'Founder',
      bio: 'Founder of SomnoAI Digital Sleep Lab.'
    },
    tags: ['Security', 'Event', 'Bug Bounty', 'Ethical Hacking'],
    readTime: '3 min',
  },
  {
    id: '2',
    slug: 'platform-update-admin-ui-security',
    title: 'Platform Update: Admin UI Enhancements & Security Fixes',
    excerpt: 'Recent updates to the Admin Dashboard, Registry UI, and platform security.',
    content: `We are excited to announce several key updates to the SomnoAI Digital Sleep Lab platform, focusing on administrative capabilities, security, and user experience.

### Admin Dashboard & Security Enhancements
- **Enhanced User Profile Tracking:** We've added tracking for \`failed_login_attempts\` and \`blocked_reason\` to the UserProfile. This allows administrators to better monitor account security and understand why accounts may have been restricted.
- **Strict Role-Based Access Control:** The Database & Auth Explorer within the Admin Dashboard is now strictly limited to users with the \`super_owner\` role. This ensures that sensitive system tables and authentication data are only accessible to the highest level of administrative personnel.

### Registry UI Overhaul
- **Comprehensive Data View:** The Registry table has been completely redesigned to support horizontal scrolling, accommodating a much wider array of user data fields.
- **Detailed User Insights:** Administrators can now view comprehensive details including User ID, Email, Role, Full Name, Block Status, Initialization Status, App Data Presence, Creation Date, Phone, Avatar URL, Login Provider, Last Sign-In, Update Time, Super Owner Status, Block Code, Country, Last Login, Blocked Reason, and Failed Login Attempts.
- **Localized Headers:** All headers in the Registry table have been updated to support Chinese localization for our international administrative team.
- **Streamlined Actions:** The action buttons (Block/Unblock) are now pinned to the right side of the table, ensuring they remain accessible even when scrolling through extensive user data.

### Platform Stability & Branding
- **Logo Resolution Fixes:** We've resolved an issue where the platform logo might not load correctly in certain environments. The logo now consistently uses the high-resolution \`logo.png\` asset across the application, including the manifest, index, privacy policy, and terms of service pages.

These updates represent our ongoing commitment to providing a secure, robust, and user-friendly platform for both our users and administrative staff.`,
    date: new Date().toISOString().split('T')[0],
    category: 'Platform Update',
    author: {
      name: 'SomnoAI Digital Sleep Lab Engineering',
      role: 'Development Team',
      bio: 'The core engineering team behind SomnoAI Digital Sleep Lab.'
    },
    tags: ['Update', 'Security', 'Admin'],
    readTime: '3 min',
    source: 'SomnoAI Digital Sleep Lab'
  },
  {
    id: '1',
    slug: 'circadian-rhythms',
    title: 'Circadian Rhythms and Health',
    excerpt: 'The impact of light exposure on your biological clock.',
    content: 'Full content here...',
    date: '2024-02-15',
    category: 'Research',
    author: {
      name: 'Sleep Journal',
      role: 'Source',
      bio: 'Peer-reviewed publication.'
    },
    tags: ['Research', 'Biology'],
    readTime: '10 min',
    source: 'Sleep Journal'
  },
  {
    id: '3',
    slug: 'beta-access-program',
    title: 'SomnoAI Digital Sleep Lab Announces Beta Access Program',
    excerpt: 'Join our exclusive beta program to experience the future of digital sleep analysis.',
    content: 'We are thrilled to announce the launch of our Beta Access Program. Early adopters will get exclusive access to our advanced neural telemetry and sleep pattern analysis tools. Join us in shaping the future of digital sleep health.',
    date: '2024-05-01',
    category: 'Announcement',
    author: {
      name: 'SomnoAI Digital Sleep Lab Team',
      role: 'Official',
      bio: 'The official voice of SomnoAI Digital Sleep Lab.'
    },
    tags: ['Beta', 'Announcement'],
    readTime: '2 min',
    source: 'SomnoAI Digital Sleep Lab'
  },
  {
    id: '4',
    slug: 'research-partnership',
    title: 'New Research Partnership on Circadian Rhythm Analysis',
    excerpt: 'SomnoAI Digital Sleep Lab partners with leading sleep research institutes.',
    content: 'SomnoAI Digital Sleep Lab has entered into a strategic partnership with top-tier sleep research institutes to further our understanding of circadian rhythms and their impact on overall health. This collaboration will bring new insights and algorithms to our platform.',
    date: '2024-04-15',
    category: 'Partnership',
    author: {
      name: 'SomnoAI Digital Sleep Lab Team',
      role: 'Official',
      bio: 'The official voice of SomnoAI Digital Sleep Lab.'
    },
    tags: ['Research', 'Partnership'],
    readTime: '4 min',
    source: 'SomnoAI Digital Sleep Lab'
  },
  {
    id: '5',
    slug: 'platform-update-algorithms',
    title: 'Platform Update: Enhanced Pattern Detection Algorithms',
    excerpt: 'Our latest update brings significant improvements to sleep pattern detection.',
    content: 'Our engineering team has rolled out a major update to our core pattern detection algorithms. Users will now experience more accurate sleep stage classification and deeper insights into their nightly rest patterns.',
    date: '2024-03-28',
    category: 'Platform Update',
    author: {
      name: 'SomnoAI Digital Sleep Lab Engineering',
      role: 'Development Team',
      bio: 'The core engineering team behind SomnoAI Digital Sleep Lab.'
    },
    tags: ['Update', 'Algorithm'],
    readTime: '3 min',
    source: 'SomnoAI Digital Sleep Lab'
  },
  {
    id: '6',
    slug: 'ai-functionality-live',
    title: 'New Feature: AI-Powered Sleep Analysis is Now Live',
    excerpt: 'Experience the next level of sleep health with our new AI-powered analysis features.',
    content: 'We are thrilled to announce that our advanced AI-powered sleep analysis features are now live! Users can now leverage cutting-edge machine learning models to gain deeper, more personalized insights into their sleep patterns and overall health. Log in to your dashboard to explore these new capabilities.',
    date: new Date().toISOString().split('T')[0],
    category: 'Announcement',
    author: {
      name: 'SomnoAI Digital Sleep Lab Team',
      role: 'Official',
      bio: 'The official voice of SomnoAI Digital Sleep Lab.'
    },
    tags: ['AI', 'Update', 'Feature'],
    readTime: '2 min',
    source: 'SomnoAI Digital Sleep Lab'
  },
  {
    id: '7',
    slug: 'meet-the-founder-vyncus-lim',
    title: 'Meet the Founder: Vyncus Lim',
    excerpt: 'Discover the vision and journey of Vyncus Lim, the founder of SomnoAI Digital Sleep Lab.',
    content: 'Vyncus Lim is the founder of SomnoAI Digital Sleep Lab, a technology initiative focused on exploring how artificial intelligence and computational analysis can be used to better understand human sleep patterns. His work centers on the intersection of emerging digital technologies, behavioral data analysis, and sleep science. Driven by a mission to transform raw sleep data into understandable, privacy-focused insights, Vyncus leads the platform\'s research, product direction, and architecture.',
    date: new Date().toISOString().split('T')[0],
    category: 'Announcement',
    author: {
      name: 'SomnoAI Digital Sleep Lab Team',
      role: 'Official',
      bio: 'The official voice of SomnoAI Digital Sleep Lab.'
    },
    tags: ['Founder', 'Vision', 'Announcement'],
    readTime: '3 min',
    source: 'SomnoAI Digital Sleep Lab'
  }
];
