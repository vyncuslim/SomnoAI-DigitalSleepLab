import fs from 'fs';
let content = fs.readFileSync('./src/data/infoContent.ts', 'utf8');
const target = `**4. 禁止行为**\n您同意不：`;
const endTarget = `**1. 数据加密**`;

const startIndex = content.indexOf(target);
const endIndex = content.indexOf(endTarget, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `**4. 禁止行为**
您同意不：
• 滥用平台或干扰其正常运行。
• 尝试绕过安全措施或利用漏洞。
• 将平台用于任何非法或未经授权的目的。

**5. 知识产权**
平台上的所有内容、算法和软件均为 SomnoAI Digital Sleep Lab 或其许可方的财产，并受知识产权法保护。

**6. 责任限制**
SomnoAI Digital Sleep Lab 按“原样”提供，不附带任何形式的保证。我们对因您使用平台而产生的任何损害不承担责任。

**7. 账户终止**
我们保留自行决定暂停或终止您账户的权利，包括因违反这些条款。\`
    },
    cookies: {
      title: "Cookie 政策",
      subtitle: "管理您的偏好",
      content: \`本 Cookie 政策解释了 SomnoAI Digital Sleep Lab 如何在您访问我们的网站时使用 Cookie 和类似技术来识别您。它解释了这些技术是什么以及我们为什么要使用它们，以及您控制我们使用它们的权利。

**1. 什么是 Cookie？**
Cookie 是当您访问网站时放置在您的计算机或移动设备上的小数据文件。网站所有者广泛使用 Cookie 来使他们的网站运行，或更有效地运行，并提供报告信息。

**2. 我们为什么要使用 Cookie？**
我们出于以下几个原因使用第一方和第三方 Cookie：
• 必要 Cookie：这些是为您提供通过我们网站提供的服务并使用其某些功能所严格必需的。
• 性能和功能 Cookie：这些用于增强我们网站的性能和功能，但对于其使用并非必需。
• 分析和定制 Cookie：这些收集的信息要么以汇总形式使用，以帮助我们了解我们的网站是如何被使用的，或者我们的营销活动有多有效。

**3. 我该如何控制 Cookie？**
您有权决定是否接受或拒绝 Cookie。您可以设置或修改您的 Web 浏览器控件以接受或拒绝 Cookie。如果您选择拒绝 Cookie，您仍然可以使用我们的网站，尽管您访问我们网站的某些功能和区域可能会受到限制。\`
    },
    security: {
      title: "安全概览",
      subtitle: "保护实验室",
      content: \`在 SomnoAI Digital Sleep Lab，安全是重中之重。我们采用多层方法来保护我们的平台、我们的数据和我们的用户。

`;
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('./src/data/infoContent.ts', content);
  console.log("Fixed!");
} else {
  console.log("Targets not found.");
}
