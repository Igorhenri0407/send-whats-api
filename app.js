const express = require('express');
const venom = require('venom-bot');
const app = express();
const authRoutes = require('./routes/authRoutes');
const userModel = require('./models/userModel');
const jwt = require('jsonwebtoken');

const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const fs = require('fs');
const { response } = require('express');
const cors = require('cors');

const port = 3600;

app.use(express.static('public'));
app.use(express.json());
app.use(cors());

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

      // Adicione a sessão na lista de sessões
      sessions.push({
        session: session.session,
        numeroDestino: session.phoneNumber,
        client: client,
      });

      const clientInfo = await client.getHostDevice();
      
      console.log(`Sessão ${session.session} criada com sucesso`);
    } catch (error) {
      console.log(`Erro ao iniciar a sessão ${session.session}:`, error);
    }
  }
};

// Quando um QR code é gerado, envie-o para o cliente específico
function sendQRCodeToClient(clientId, qrCodeData) {
  io.to(clientId).emit('qrCode', qrCodeData);
}

// Quando os dados do clientInfo forem recebidos, envie-os para o cliente
function sendClientInfoToClient(clientId, clientInfo) {
  //userModel.findOneAndUpdate(token, sessionName)
      //.then(results => {
        //const token_session = results.token_session;
        // Resultados da atualização do banco de dados
        //console.log('Resultado da atualização:', token_session);
        // Continuar com o restante do código aqui
      //})
      //.catch(error => {
        // Tratar erros
        //console.error('Erro na atualização:', error);
      //});
  
  io.to(clientId).emit('clientInfo', clientInfo);
}

io.on('connection', function (socket) {
  console.log('Cliente conectado');

  socket.on('createSession', async function (data) {
    const sessionName = data.sessionName;
    const phoneNumber = data.phoneNumber;
    const message = data.message;
    const token = data.token;

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
        phoneNumber: phoneNumber,
        client: client,
        //credit: 10, // Set an initial credit value for each session
      });

      const clientInfo = await client.getHostDevice();
      //console.log('Informações do dispositivo hospedeiro:', clientInfo);
      socket.emit('sessionCreated', clientInfo);

      sendClientInfoToClient(socket.id, clientInfo);
      
      userModel.findOneAndUpdate(token, sessionName)
      .then(results => {
        const token_session = results.token_session;
        // Resultados da atualização do banco de dados
        console.log('Token da Seção:', token_session);
        //io.to(clientId).emit('clientInfo', {clientInfo, token_session});
        socket.emit('clientInfo', {clientInfo, token_session});
        // Continuar com o restante do código aqui
      })
      .catch(error => {
        // Tratar erros
        //console.error('Erro na atualização:', error);
      });

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

app.post('/api/sendMessage', async (req, res) => {
  try {
    const { token_session, mensagem, phoneNumber } = req.body;
    const chaveSecreta = 'your_secret_key';
    const decoded = jwt.verify(token_session, chaveSecreta);

    // Find the session associated with the provided sessionName
    const session = sessions.find((session) => session.session === decoded.token_session);

    if (!session) {
      return res.status(400).json({ error: 'Sessão não encontrada' });
    }
    // Exemplo de uso no controlador
    userModel.getUserQtd_Msg(token_session)
    .then((result) => {
      // Aqui você tem acesso ao resultado do SELECT
      // Acessando o valor 0 da propriedade qtd_msg
    const qtdMsg = result.qtd_msg;
    console.log(qtdMsg); // 0
      // Faça o que for necessário com o resultado
    // Check if the session has enough credit to send the message
    if (qtdMsg <= 0) {
      return res.status(400).json({ error: 'Crédito insuficiente' });
    }else {
      const client = session.client;

    // Send the message using the Venom client
    client.sendText(phoneNumber, mensagem);

    // Update the qtd_msg column
    const restam = qtdMsg - 1;
    userModel.decreaseUserQtd_Msg(token_session)
      .then(() => {
        res.status(200).json({ message: 'Mensagem enviada com sucesso', Restam: restam });
      })
      .catch((error) => {
        res.status(500).json({ error: 'Erro ao atualizar a quantidade de mensagens' });
      });
    }
    })
    .catch((error) => {
      // Trate erros caso ocorra algum problema na consulta
      console.error(error);
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Falha ao enviar mensagem' });
  }
});

app.use('/', authRoutes);
// Logs de depuração
app.use((req, res, next) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);
  next();
});

server.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});

startSessions();
