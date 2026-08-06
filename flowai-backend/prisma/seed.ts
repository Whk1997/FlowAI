import { PrismaClient, Priority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@flowai.dev';
  const password = 'demo123456';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      name: 'Demo User',
    },
    create: {
      email,
      password: passwordHash,
      name: 'Demo User',
    },
  });

  const taskCount = await prisma.task.count({ where: { userId: user.id } });
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: '体验任务看板',
          description: '把本卡片从待办拖到进行中 / 完成',
          status: TaskStatus.TODO,
          priority: Priority.HIGH,
          userId: user.id,
        },
        {
          title: '写一篇 Markdown 笔记',
          description: '试试收藏、归档与 AI 总结',
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          userId: user.id,
        },
        {
          title: '上传一个附件',
          description: '在笔记详情页上传图片或 PDF',
          status: TaskStatus.DONE,
          priority: Priority.LOW,
          userId: user.id,
        },
      ],
    });
  }

  const noteCount = await prisma.note.count({ where: { userId: user.id } });
  if (noteCount === 0) {
    await prisma.note.create({
      data: {
        title: 'FlowAI 演示笔记',
        content: `# FlowAI 演示

这是一篇用于演示的 Markdown 笔记。

## 已完成

- 邮箱注册 / 登录
- 任务看板
- 笔记编辑与预览
- 附件上传
- AI 总结

## 下一步

- 打磨体验并部署上线
`,
        isFavorite: true,
        userId: user.id,
      },
    });
  }

  console.log('Demo account ready:');
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
