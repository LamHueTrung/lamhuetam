import { Handler } from '@netlify/functions';
import nacl from 'tweetnacl';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { connectDB } from './_db';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  if (!PUBLIC_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DISCORD_PUBLIC_KEY not configured' }) };
  }

  const signature = event.headers['x-signature-ed25519'] || '';
  const timestamp = event.headers['x-signature-timestamp'] || '';
  const rawBody = event.body || '';

  try {
    const isVerified = nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + rawBody),
      hexToUint8Array(signature),
      hexToUint8Array(PUBLIC_KEY)
    );

    if (!isVerified) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }
  } catch {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Signature verification failed' }) };
  }

  try {
    const interaction = JSON.parse(rawBody);

    if (interaction.type === InteractionType.PING) {
      return { statusCode: 200, headers, body: JSON.stringify({ type: InteractionResponseType.PONG }) };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;
      return await handleCommand(name, interaction);
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown interaction type' }) };
  } catch (error: any) {
    console.error('discord error:', error);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ Có lỗi xử lý lệnh.' } })
    };
  }
};

async function handleCommand(name: string, interaction: any) {
  const headers = { 'Content-Type': 'application/json' };

  switch (name) {
    case 'balance':
      return await cmdBalance(interaction);

    case 'help':
      return helpResponse();

    default:
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `❌ Lệnh \`/${name}\` chưa được triển khai.\n\n**Lệnh khả dụng:**\`\`\`\n/balance - Số dư & thu chi tháng này\n/help   - Danh sách lệnh\`\`\`` }
        })
      };
  }
}

function formatVND(num: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num / 1000)) + 'k';
}

function formatFullVND(num: number) {
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
}

async function cmdBalance(interaction: any) {
  const content = await getBalanceContent();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content }
    })
  };
}

async function getBalanceContent(): Promise<string> {
  try {
    const db = await connectDB();
    const collection = db.connection.collection('transactions');
    const transactions = await collection.find({}).toArray() as any[];

    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7);

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const incomeThisMonth = transactions
      .filter(t => t.type === 'income' && t.date?.startsWith(monthStr))
      .reduce((s, t) => s + t.amount, 0);

    const expenseThisMonth = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(monthStr))
      .reduce((s, t) => s + t.amount, 0);

    return [
      '**📊 Tổng quan tài chính**',
      '',
      `**Từ trước đến nay:**`,
      `• Thu nhập: \`${formatFullVND(income)}\``,
      `• Chi tiêu: \`${formatFullVND(expense)}\``,
      `• Còn lại: \`${formatFullVND(income - expense)}\``,
      '',
      `**Tháng ${monthStr}:**`,
      `• Thu nhập: \`${formatFullVND(incomeThisMonth)}\``,
      `• Chi tiêu: \`${formatFullVND(expenseThisMonth)}\``,
      `• Còn lại: \`${formatFullVND(incomeThisMonth - expenseThisMonth)}\``,
    ].join('\n');
  } catch (error) {
    console.error('getBalanceContent error:', error);
    return '❌ Không thể kết nối cơ sở dữ liệu.';
  }
}

function helpResponse() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: [
          '**🤖 TaiChinh Bot - Trợ lý tài chính**',
          '',
          '**Lệnh khả dụng:**',
          '• `/balance` — Số dư & thu chi',
          '• `/help` — Danh sách lệnh',
          '',
          '_Đang phát triển thêm: spending, debts, add, advice..._'
        ].join('\n')
      }
    })
  };
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  return new Uint8Array((matches || []).map(byte => parseInt(byte, 16)));
}
