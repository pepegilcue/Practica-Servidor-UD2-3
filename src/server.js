const config = require('./config');
const { crearApp } = require('./app');

crearApp().listen(config.port, () => {
  console.log(`Servidor escuchando en http://localhost:${config.port}`);
});
