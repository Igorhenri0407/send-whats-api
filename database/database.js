const mysql = require('mysql');

// Create MySQL database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'api_whatsapp',
});

connection.connect((error) => {
  /*const createTableScoresQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        qtd_msg int NULL,
        createdAt DATETIME NOT NULL
      )`;

  connection.query(createTableScoresQuery, (error) => {
      if (error) {
          console.error('Erro ao criar a tabela users:', error);
          return;
      }
      console.log('Tabela users criada com sucesso ou Tabela já Existente.');
  });*/
  

  if (error) {
      console.error('Erro na conexão com o banco de dados:', error);
      return;
  }
  console.log('Conexão bem-sucedida com o banco de dados.');
});

module.exports = connection;
