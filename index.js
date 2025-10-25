require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Helper function to get Application ID from bot token
function getApplicationIdFromToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length >= 1) {
      const decoded = Buffer.from(parts[0], 'base64').toString('utf-8');
      return decoded;
    }
  } catch (error) {
    console.error('Error decoding token:', error);
  }
  return null;
}

// Get Application ID (try from env, or decode from token)
let APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
if (!APPLICATION_ID || !/^\d+$/.test(APPLICATION_ID)) {
  console.log('Invalid or missing APPLICATION_ID, extracting from bot token...');
  APPLICATION_ID = getApplicationIdFromToken(process.env.DISCORD_BOT_TOKEN);
  console.log(`Extracted Application ID: ${APPLICATION_ID}`);
}

// Create directories for storage
const STORAGE_DIR = path.join(__dirname, 'storage');
const OBFUSCATED_DIR = path.join(STORAGE_DIR, 'obfuscated');
const PROTECTED_DIR = path.join(STORAGE_DIR, 'protected');

[STORAGE_DIR, OBFUSCATED_DIR, PROTECTED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ]
});

// Express app for protection links
const app = express();
const PORT = 5000;

// Store protected files in memory (in production, use a database)
const protectedFiles = new Map();

// Lua obfuscator function
function obfuscateLua(code) {
  // Advanced Lua obfuscation
  let obfuscated = code;
  
  // Step 1: Remove comments
  obfuscated = obfuscated.replace(/--\[\[[\s\S]*?\]\]/g, '');
  obfuscated = obfuscated.replace(/--[^\n]*/g, '');
  
  // Step 2: Minify whitespace
  obfuscated = obfuscated.replace(/\s+/g, ' ');
  
  // Step 3: Variable name obfuscation
  const varMap = new Map();
  let varCounter = 0;
  
  // Find local variables
  const localVarRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = localVarRegex.exec(code)) !== null) {
    const varName = match[1];
    if (!varMap.has(varName)) {
      varMap.set(varName, `_0x${varCounter.toString(16)}`);
      varCounter++;
    }
  }
  
  // Replace variables
  varMap.forEach((newName, oldName) => {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    obfuscated = obfuscated.replace(regex, newName);
  });
  
  // Step 4: String encryption
  obfuscated = obfuscated.replace(/"([^"]*)"/g, (match, str) => {
    const bytes = Buffer.from(str).toString('hex');
    return `(function() local s = "${bytes}"; local r = ""; for i = 1, #s, 2 do r = r .. string.char(tonumber(s:sub(i, i+1), 16)) end return r end)()`;
  });
  
  obfuscated = obfuscated.replace(/'([^']*)'/g, (match, str) => {
    const bytes = Buffer.from(str).toString('hex');
    return `(function() local s = "${bytes}"; local r = ""; for i = 1, #s, 2 do r = r .. string.char(tonumber(s:sub(i, i+1), 16)) end return r end)()`;
  });
  
  // Step 5: Control flow obfuscation
  const wrapper = `(function() ${obfuscated} end)()`;
  
  return wrapper;
}

// Slash commands definition
const commands = [
  {
    name: 'obfuscate',
    description: 'Obfuscate file Lua',
    options: [
      {
        name: 'file',
        description: 'File Lua untuk di-obfuscate',
        type: 11, // ATTACHMENT type
        required: true
      }
    ]
  },
  {
    name: 'protect-lua',
    description: 'Protect Lua code dengan link yang hanya bisa diakses Roblox',
    options: [
      {
        name: 'input',
        description: 'File Lua, attachment, atau text untuk di-protect',
        type: 11, // ATTACHMENT type
        required: false
      },
      {
        name: 'text',
        description: 'Atau masukkan text/code Lua langsung',
        type: 3, // STRING type
        required: false
      }
    ]
  },
  {
    name: 'crack',
    description: 'Akses dan copy konten dari URL yang dilindungi',
    options: [
      {
        name: 'url',
        description: 'URL yang ingin di-crack',
        type: 3, // STRING type
        required: true
      }
    ]
  }
];

// Register slash commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(APPLICATION_ID),
      { body: commands }
    );
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Command: /obfuscate
async function handleObfuscate(interaction) {
  await interaction.deferReply();
  
  try {
    const attachment = interaction.options.getAttachment('file');
    
    if (!attachment) {
      return interaction.editReply('❌ File tidak ditemukan!');
    }
    
    // Check if it's a Lua file
    if (!attachment.name.endsWith('.lua')) {
      return interaction.editReply('❌ File harus berformat .lua!');
    }
    
    // Download the file
    const response = await axios.get(attachment.url);
    const luaCode = response.data;
    
    // Obfuscate the code
    const obfuscatedCode = obfuscateLua(luaCode);
    
    // Save obfuscated file
    const fileName = `obfuscated_${Date.now()}_${attachment.name}`;
    const filePath = path.join(OBFUSCATED_DIR, fileName);
    fs.writeFileSync(filePath, obfuscatedCode);
    
    // Send back the obfuscated file
    const fileAttachment = new AttachmentBuilder(filePath, { name: fileName });
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Obfuscation Berhasil!')
      .setDescription(`File **${attachment.name}** telah di-obfuscate.`)
      .addFields(
        { name: 'File Asli', value: attachment.name, inline: true },
        { name: 'Ukuran Asli', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true },
        { name: 'File Obfuscated', value: fileName, inline: false }
      )
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], files: [fileAttachment] });
    
  } catch (error) {
    console.error('Error in /obfuscate:', error);
    await interaction.editReply('❌ Terjadi kesalahan saat obfuscate file!');
  }
}

// Command: /protect-lua
async function handleProtectLua(interaction) {
  await interaction.deferReply();
  
  try {
    const attachment = interaction.options.getAttachment('input');
    const textInput = interaction.options.getString('text');
    
    let luaCode = '';
    let fileName = '';
    
    if (attachment) {
      // Download file
      const response = await axios.get(attachment.url);
      luaCode = response.data;
      fileName = attachment.name;
    } else if (textInput) {
      luaCode = textInput;
      fileName = `protected_${Date.now()}.lua`;
    } else {
      return interaction.editReply('❌ Harap berikan file atau text untuk di-protect!');
    }
    
    // STEP 1: Obfuscate the Lua code first
    const obfuscatedCode = obfuscateLua(luaCode);
    
    // Generate unique ID
    const uniqueId = crypto.randomBytes(16).toString('hex');
    
    // Save obfuscated + protected file
    const protectedFilePath = path.join(PROTECTED_DIR, `${uniqueId}.lua`);
    fs.writeFileSync(protectedFilePath, obfuscatedCode);
    
    // Store metadata
    protectedFiles.set(uniqueId, {
      code: obfuscatedCode,
      fileName: fileName,
      createdAt: new Date(),
      createdBy: interaction.user.tag
    });
    
    // Generate protection link (simple domain)
    const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protectionUrl = `https://${domain}/protected/${uniqueId}`;
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🔒 Script Protected & Obfuscated!')
      .setDescription('Script telah di-obfuscate dan di-protect!\nLink ini hanya bisa diakses dari Roblox!')
      .addFields(
        { name: 'File Name', value: fileName, inline: true },
        { name: 'Protection ID', value: uniqueId, inline: true },
        { name: 'Status', value: '✅ Obfuscated + Protected', inline: true },
        { name: 'Protection URL', value: `\`${protectionUrl}\``, inline: false },
        { name: '⚠️ Important', value: 'Link ini hanya bisa diakses dengan Roblox User-Agent', inline: false }
      )
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in /protect-lua:', error);
    await interaction.editReply('❌ Terjadi kesalahan saat membuat protection link!');
  }
}

// Command: /crack
async function handleCrack(interaction) {
  await interaction.deferReply();
  
  try {
    const url = interaction.options.getString('url');
    
    // Try to fetch the URL with various user agents
    const userAgents = [
      'Roblox/WinInet',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'RobloxStudio/WinInet',
      'Roblox/Unknown',
    ];
    
    let content = null;
    let usedAgent = null;
    
    for (const agent of userAgents) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': agent
          },
          timeout: 10000
        });
        content = response.data;
        usedAgent = agent;
        break;
      } catch (err) {
        continue;
      }
    }
    
    if (!content) {
      return interaction.editReply('❌ Tidak dapat mengakses URL tersebut!');
    }
    
    // Convert content to string if necessary
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    
    // Save to file
    const fileName = `cracked_${Date.now()}.txt`;
    const filePath = path.join(STORAGE_DIR, fileName);
    fs.writeFileSync(filePath, contentStr);
    
    const fileAttachment = new AttachmentBuilder(filePath, { name: fileName });
    
    const embed = new EmbedBuilder()
      .setColor(0xFF9900)
      .setTitle('🔓 Crack Berhasil!')
      .setDescription('Konten dari URL telah berhasil di-copy.')
      .addFields(
        { name: 'URL', value: url, inline: false },
        { name: 'User-Agent Used', value: usedAgent, inline: false },
        { name: 'Content Size', value: `${(contentStr.length / 1024).toFixed(2)} KB`, inline: true }
      )
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], files: [fileAttachment] });
    
  } catch (error) {
    console.error('Error in /crack:', error);
    await interaction.editReply('❌ Terjadi kesalahan saat crack URL!');
  }
}

// Discord bot event handlers
client.on('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  try {
    switch (commandName) {
      case 'obfuscate':
        await handleObfuscate(interaction);
        break;
      case 'protect-lua':
        await handleProtectLua(interaction);
        break;
      case 'crack':
        await handleCrack(interaction);
        break;
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Terjadi kesalahan!', ephemeral: true });
    }
  }
});

// Express routes for protection links
app.get('/protected/:id', (req, res) => {
  const { id } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  
  // Check if request is from Roblox
  const isRoblox = userAgent.includes('Roblox') || userAgent.includes('roblox');
  
  if (!isRoblox) {
    return res.status(403).send('Access Denied: This resource can only be accessed from Roblox.');
  }
  
  // Check if file exists
  const protectedData = protectedFiles.get(id);
  if (!protectedData) {
    return res.status(404).send('Protected file not found.');
  }
  
  // Return the Lua code
  res.setHeader('Content-Type', 'text/plain');
  res.send(protectedData.code);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Protection server is running' });
});

// Start servers
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Protection server running on port ${PORT}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
