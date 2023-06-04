const express = require('express');
const venom = require('venom-bot');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const fs = require('fs');
const { response } = require("express");
const cors = require('cors');


const port = 3000;

app.use(express.static('public'));
app.use(express.json());
//app.use(cors());


const sessions = [];

const startSessions = async () => {
  for (const session of sessions) {
    try {
      const client = await venom.create(
        session.session,
        (base64Qr, asciiQR, attempts, urlCode) => {
          console.log(asciiQR);
          const matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const response = {};

          if (matches.length !== 3) {
            throw new Error('Invalid input string');
          }

          response.type = matches[1];
          response.data = Buffer.from(matches[2], 'base64');

          fs.writeFile('out.png', response.data, 'binary', function (err) {
            if (err != null) {
              console.log(err);
            } else {
              // Emita o evento 'qrCode' para o cliente específico
              sendQRCodeToClient(session.session, matches[2]);
            }
          });
        },
        undefined,
        { logQR: false }
      );
      start(client, session.numeroDestino);
      console.log(`Sessão ${session.session} iniciada com sucesso`);
    } catch (error) {
      console.log(`Erro ao iniciar a sessão ${session.session}:`, error);
    }
  }
};

// Quando um QR code é gerado, envie-o para o cliente específico
function sendQRCodeToClient(clientId, qrCodeData) {
  io.to(clientId).emit('qrCode', qrCodeData);
}

io.on('connection', function (socket) {
  console.log('Cliente conectado');

  socket.on('createSession', async function (data) {
    const sessionName = data.sessionName;
    const phoneNumber = data.phoneNumber;
    const message = data.message;
    console.log(data);

    // Verifica se a sessão já existe
    const sessionExists = sessions.find((session) => session.session === sessionName);
    if (sessionExists) {
      socket.emit('sessionError', 'A sessão já existe');
      return;
    }

    // Cria a nova sessão
    try {
      const client = await venom.create(
        sessionName,
        (base64Qr, asciiQR, attempts, urlCode) => {
          console.log(asciiQR);
          const matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const response = {};

          if (matches.length !== 3) {
            throw new Error('Invalid input string');
          }

          response.type = matches[1];
          response.data = Buffer.from(matches[2], 'base64');

          fs.writeFile('out.png', response.data, 'binary', function (err) {
            if (err != null) {
              console.log(err);
            } else {
              // Emita o evento 'qrCode' para o cliente específico
              socket.emit('sessionCreated', `data:image/png;base64,${matches[2]}`);
            }
          });
        },
        undefined,
        { logQR: false }
      );

      // Adiciona a sessão na lista de sessões
      sessions.push({
        session: sessionName,
        numeroDestino: phoneNumber,
        client: client
      });

      start(client, phoneNumber);
      console.log(`Sessão ${sessionName} criada com sucesso`);

    } catch (error) {
      socket.emit('sessionError', `Erro ao criar a sessão ${sessionName}: ${error}`);
    }
  });

  socket.on('disconnect', function () {
    console.log('Cliente desconectado');
  });
});

// Rota para exibir o QR code
app.get('/api/qrcode', (req, res) => {
  // Carregue o arquivo de imagem do QR code
  fs.readFile('out.png', function (err, data) {
    if (err != null) {
      console.log(err);
      return res.status(500).json({ error: 'Erro ao ler o QR code' });
    }

    // Retorne o QR code como uma imagem
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(data);
  });
});

// Rota para enviar mensagem
app.post('/api/sendMessage', async (req, res) => {
  try {
    const { sessionName, id, storeUrl, phoneNumber, status } = req.body;

    // Find the session associated with the provided sessionName
    const session = sessions.find((session) => session.session === sessionName);

    if (!session) {
      return res.status(400).json({ error: 'Session not found' });
    }

    const client = session.client;

    // Compose your message content based on the provided data
    const message = `Sua Compra em ${storeUrl} de Id ${id} Foi Atualizada para ${status}`;

    // Send the message using the Venom client
    await client.sendText(phoneNumber, message);

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Debug logs
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

server.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});


startSessions();
