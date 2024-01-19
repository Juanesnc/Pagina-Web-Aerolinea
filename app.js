const express = require('express');
const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const port = 8080;

let conexion = mysql.createConnection({
    host: "localhost",
    database: "BDAerolinea",
    user: "root",
    password: ""
});

app.set('view engine', 'hbs');

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/sesionUsuario', (req, res) => {
    const vueloJSON1 = req.query.vuelo;
    const vueloJSON2 = JSON.parse(decodeURIComponent(vueloJSON1));
    const vuelo = JSON.parse(vueloJSON2);
    res.render('reservaYPagos', { vuelo });
});

app.post('/crear', (req, res) => {
    const datos = req.body;

    const nuevosDatos = {
        nombre: 'nombre VARCHAR(30) PRIMARY KEY',
        apellido: 'apellido VARCHAR(30)',
        pais: 'pais VARCHAR(20)',
        tipoDocumento: 'tipoDocumento VARCHAR(25)',
        documento: 'documento INT',
        correo: 'correo VARCHAR(30)',
        contrasena: 'contrasena VARCHAR(30)'
    }

    bcrypt.hash(datos.contrasena, 12).then(hash => {
        datos.contrasena = hash;
    });

    conexion.query(`CREATE TABLE IF NOT EXISTS tabla_usuarios (${nuevosDatos.nombre}, ${nuevosDatos.apellido}, ${nuevosDatos.pais}, ${nuevosDatos.tipoDocumento}, ${nuevosDatos.documento}, ${nuevosDatos.correo}, ${nuevosDatos.contrasena})`, (error, row) => {
        if (error) {
            console.log("*Ocurrio un error al ingresar la base de datos! ", error.message);
        } else {
            console.log('La tabla se ha creado exitosamente o ya existia!');
        }
    });

    conexion.query("SELECT * FROM tabla_usuarios WHERE documento = ? OR correo = ?", [datos.documento, datos.correo], (error, row) => {
        if (error) {
            res.render('home', { error: "*Error al procesar la solicitud!" });
        } else {
            if (row.length > 0) {
                res.render('home', { error: "*Ya existe el usuario, verifique el correo o el documento!" });
            } else {
                conexion.query('INSERT INTO tabla_usuarios SET ?', [datos], (error) => {
                    if (error) {
                        res.render('home', { error: "*Error al insertar en la base de datos!" });
                    } else {
                        res.redirect('/');
                    }
                });
            }
        }
    });

});

app.post('/sesionUsuario', (req, res) => {
    const datos = req.body;
    let vuelos = [];
    let tickets = [];

    let condiciones = {
        condicionModelo: datos.condicionModelo,
        condicionAOrigen: datos.condicionAOrigen,
        condicionADestino: datos.condicionADestino,
        condicionFechaLlegada: datos.condicionFechaLlegada,
        condicionFechaSalida: datos.condicionFechaSalida,
        condicionTarifaVuelo: datos.condicionTarifaVuelo
    }

    const tablaVuelos = {
        id: 'id INT(10) PRIMARY KEY',
        numero: 'numero VARCHAR(10)',
        aeropuertoOrigen: 'aeropuertoOrigen VARCHAR(20)',
        aeropuertoDestino: 'aeropuertoDestino VARCHAR(20)',
        fechaLlegada: 'fechaLlegada DATETIME(6)',
        fechaSalida: 'fechaSalida DATETIME(6)',
        observaciones: 'observaciones VARCHAR(10)',
        asientos: 'asientos INT(3)',
        tarifaVuelo: 'tarifaVuelo INT(10)'
    }

    let condicionTrue = Object.values(condiciones).every(valor => valor === '');

    if (Object.values(condiciones).every(valor => valor === undefined)) {
        condicionTrue = true;
    }

    if (!condicionTrue) {

        crearTablaConsulta(vuelos, condiciones);
        crearTablaTicket(tickets, datos.correo);

        conexion.query('SELECT * FROM tabla_usuarios WHERE correo = ?', [datos.correo], (error, row) => {
            if (error) {
                res.render('home', { error: "*Ocurrio un error al ingresar el formulario!" });
            } else {

                if (row.length > 0) {

                    row.forEach(element => {

                        if (datos.contrasena == element.contrasena) {
                            req.session.loggedin = true;
                            req.session.name = element.nombre;
                            res.render('Aerolinea', {
                                titulo: element.nombre + ' ' + element.apellido,
                                usuario: element,
                                vuelos: vuelos,
                                tickets: tickets
                            });
                        } else {
                            res.render('home', { error: "*Contraseña incorrecta!" });
                        }
                    });

                } else {
                    res.render('home', { error: "*El usuario no existe!" });
                }

            }
        });
    } else {

        conexion.query(`CREATE TABLE IF NOT EXISTS tabla_vuelos (${tablaVuelos.id}, ${tablaVuelos.numero}, ${tablaVuelos.aeropuertoOrigen}, ${tablaVuelos.aeropuertoDestino}, ${tablaVuelos.fechaLlegada}, ${tablaVuelos.fechaSalida}, ${tablaVuelos.observaciones}, ${tablaVuelos.asientos}, ${tablaVuelos.tarifaVuelo})`, (error, row) => {
            if (error) {
                console.log("*Ocurrio un error al ingresar la base de datos! ", error.message);
            } else {
                console.log('La tabla se ha creado exitosamente o ya existe!');
                conexion.query('SELECT COUNT(*) AS Count FROM tabla_vuelos', (error, row) => {
                    if (error) {
                        console.log("*Ocurrio un error al realizar la consulta! ", error.message);
                    } else {
                        const rowCount = row[0].Count;

                        if (rowCount === 0) {

                            const vuelosDefault = [
                                {
                                    id: 1,
                                    numero: 'ANR3654',
                                    aeropuertoOrigen: 'BOG',
                                    aeropuertoDestino: 'SMR',
                                    fechaLlegada: '2024-01-23 20:53:00',
                                    fechaSalida: '2024-01-23 19:20:00',
                                    observaciones: '',
                                    asientos: 128,
                                    tarifaVuelo: 150000
                                },
                                {
                                    id: 2,
                                    numero: 'WZZ2464',
                                    aeropuertoOrigen: 'BOG',
                                    aeropuertoDestino: 'MEX',
                                    fechaLlegada: '2024-01-21 08:40:00',
                                    fechaSalida: '2024-01-21 03:30:00',
                                    observaciones: '',
                                    asientos: 120,
                                    tarifaVuelo: 820000
                                },
                                {
                                    id: 3,
                                    numero: 'CRU2698',
                                    aeropuertoOrigen: 'BOG',
                                    aeropuertoDestino: 'MED',
                                    fechaLlegada: '2024-01-27 13:15:00',
                                    fechaSalida: '2024-01-27 12:00:00',
                                    observaciones: '',
                                    asientos: 90,
                                    tarifaVuelo: 230000
                                },
                                {
                                    id: 4,
                                    numero: 'WZZ2464',
                                    aeropuertoOrigen: 'MEX',
                                    aeropuertoDestino: 'JFK',
                                    fechaLlegada: '2024-01-21 17:20:00',
                                    fechaSalida: '2024-01-21 12:18:00',
                                    observaciones: '',
                                    asientos: 120,
                                    tarifaVuelo: 1200000
                                },
                                {
                                    id: 5,
                                    numero: 'BTY2367',
                                    aeropuertoOrigen: 'MEX',
                                    aeropuertoDestino: 'BOG',
                                    fechaLlegada: '2024-01-29 01:25:00',
                                    fechaSalida: '2024-01-28 20:10:00',
                                    observaciones: '',
                                    asientos: 90,
                                    tarifaVuelo: 820000
                                },
                                {
                                    id: 6,
                                    numero: 'WZZ2464',
                                    aeropuertoOrigen: 'MEX',
                                    aeropuertoDestino: 'YVR',
                                    fechaLlegada: '2024-01-28 10:55:00',
                                    fechaSalida: '2024-01-28 04:20:00',
                                    observaciones: '',
                                    asientos: 120,
                                    tarifaVuelo: 1400000
                                },
                                {
                                    id: 7,
                                    numero: 'ZRT2494',
                                    aeropuertoOrigen: 'BOG',
                                    aeropuertoDestino: 'CLO',
                                    fechaLlegada: '2024-01-24 08:15:00',
                                    fechaSalida: '2024-01-24 07:00:00',
                                    observaciones: '',
                                    asientos: 128,
                                    tarifaVuelo: 200000
                                },
                                {
                                    id: 8,
                                    numero: 'ANR3654',
                                    aeropuertoOrigen: 'ADZ',
                                    aeropuertoDestino: 'JFK',
                                    fechaLlegada: '2024-01-26 21:37:00',
                                    fechaSalida: '2024-01-26 12:05:00',
                                    observaciones: '',
                                    asientos: 128,
                                    tarifaVuelo: 2500000
                                }
                            ];

                            const vuelosInsert = vuelosDefault.map(vuelo => `(${vuelo.id}, '${vuelo.numero}', '${vuelo.aeropuertoOrigen}', '${vuelo.aeropuertoDestino}', '${vuelo.fechaLlegada}', '${vuelo.fechaSalida}', '${vuelo.observaciones}', ${vuelo.asientos}, ${vuelo.tarifaVuelo})`);

                            conexion.query('INSERT INTO tabla_vuelos (id, numero, aeropuertoOrigen, aeropuertoDestino, fechaLlegada, fechaSalida, observaciones, asientos, tarifaVuelo) VALUES ' + vuelosInsert.join(', '), (error) => {
                                if (error) {
                                    console.log("*Ocurrio un error al realizar la consulta! ", error.message)
                                } else {
                                    console.log('Los datos se han ingresado exitosamente!');

                                    crearTablaConsulta(vuelos);

                                    conexion.query('SELECT * FROM tabla_usuarios WHERE correo = ?', [datos.correo], (error, row) => {
                                        if (error) {
                                            res.render('home', { error: "*Ocurrio un error al ingresar el formulario!" });
                                        } else {

                                            if (row.length > 0) {

                                                row.forEach(element => {

                                                    if (datos.contrasena == element.contrasena) {
                                                        req.session.loggedin = true;
                                                        req.session.name = element.nombre;
                                                        res.render('Aerolinea', {
                                                            titulo: element.nombre + ' ' + element.apellido,
                                                            usuario: element,
                                                            vuelos: vuelos,
                                                            tickets: tickets
                                                        });
                                                    } else {
                                                        res.render('home', { error: "*Contraseña incorrecta!" });
                                                    }
                                                });

                                            } else {
                                                res.render('home', { error: "*El usuario no existe!" });
                                            }

                                        }
                                    });

                                }
                            });
                        } else {

                            crearTablaConsulta(vuelos);
                            crearTablaTicket(tickets, datos.correo);

                            conexion.query('SELECT * FROM tabla_usuarios WHERE correo = ?', [datos.correo], (error, row) => {
                                if (error) {
                                    res.render('home', { error: "*Ocurrio un error al ingresar el formulario!" });
                                } else {

                                    if (row.length > 0) {

                                        row.forEach(element => {

                                            if (datos.contrasena == element.contrasena) {
                                                req.session.loggedin = true;
                                                req.session.name = element.nombre;
                                                res.render('Aerolinea', {
                                                    titulo: element.nombre + ' ' + element.apellido,
                                                    usuario: element,
                                                    vuelos: vuelos,
                                                    tickets: tickets
                                                });
                                            } else {
                                                res.render('home', { error: "*Contraseña incorrecta!" });
                                            }
                                        });

                                    } else {
                                        res.render('home', { error: "*El usuario no existe!" });
                                    }

                                }
                            });
                        }
                    }
                });

            }
        });

    }
});

function crearTablaConsulta(vuelos, condicion = '') {

    if (condicion == '') {
        conexion.query("SELECT * FROM tabla_vuelos", (error, row) => {

            row.forEach(element => {

                let vuelo = {
                    id: element.id,
                    numero: element.numero,
                    aeropuertoOrigen: element.aeropuertoOrigen,
                    aeropuertoDestino: element.aeropuertoDestino,
                    fechaLlegada: element.fechaLlegada,
                    fechaSalida: element.fechaSalida,
                    observaciones: element.observaciones,
                    tarifaVuelo: element.tarifaVuelo
                }

                vuelos.push(vuelo);

            });

        });
    } else {
        conexion.query("SELECT * FROM tabla_vuelos WHERE numero = ? OR aeropuertoOrigen = ? OR aeropuertoDestino = ? OR fechaLlegada = ? OR fechaSalida = ? OR tarifaVuelo = ?", [condicion.condicionModelo, condicion.condicionAOrigen, condicion.condicionADestino, condicion.condicionFechaLlegada, condicion.condicionFechaSalida, condicion.condicionTarifaVuelo], (error, row) => {

            row.forEach(element => {

                let vuelo = {
                    id: element.id,
                    numero: element.numero,
                    aeropuertoOrigen: element.aeropuertoOrigen,
                    aeropuertoDestino: element.aeropuertoDestino,
                    fechaLlegada: element.fechaLlegada,
                    fechaSalida: element.fechaSalida,
                    observaciones: element.observaciones,
                    tarifaVuelo: element.tarifaVuelo
                }

                vuelos.push(vuelo);

            });

        });
    }

};

function crearTablaTicket(tickets, correo) {

    conexion.query("SELECT * FROM tabla_tickets WHERE correo = ?", [correo], (error, row) => {

        if (row !== undefined) {
            row.forEach(element => {

                let ticket = {
                    numero: element.numero,
                    fechaVencimiento: element.fechaVencimiento,
                    correo: element.correo,
                    nombre: element.nombre,
                    vuelo: element.vuelo
                }

                tickets.push(ticket);

            });
        }

    });
};

app.post('/irAReserva', (req, res) => {

    const datos = req.body;

    conexion.query('SELECT * FROM tabla_usuarios WHERE correo = ?', [datos.correo], (error, usuario) => {
        if (error) {
            console.log("*Ocurrio un error al realizar la consulta! ", error.message);
        } else {

            conexion.query("SELECT * FROM tabla_vuelos WHERE id = ?", [req.body.numeroVuelo], (error, row) => {
                if (error) {
                    console.log("*Ocurrio un error al realizar la consulta! ", error.message);
                } else {

                    const vuelo = Object.assign({}, row[0], usuario[0]);
                    const vueloJSON = JSON.stringify(vuelo);

                    return res.json(vueloJSON);
                }
            });

        }
    });

});

app.post('/confirmarReserva', (req, res) => {
    let datos = req.body.id;
    let vuelos = [];
    let tickets = [];

    crearTablaConsulta(vuelos);

    let vuelo = {
        id: req.body.id,
        numero: req.body.numero,
        aeropuertoOrigen: req.body.aeropuertoOrigen,
        aeropuertoDestino: req.body.aeropuertoDestino,
        fechaLlegada: req.body.fechaLlegada,
        fechaSalida: req.body.fechaSalida
    }

    const nuevosTicket = {
        numero: 'numero VARCHAR(5)',
        fechaVencimiento: 'fechaVencimiento DATETIME(6)',
        correo: 'correo VARCHAR(20)',
        nombre: 'nombre VARCHAR(20)',
        vuelo: 'vuelo VARCHAR(50)'
    }

    const datosTicket = {
        numero: req.body.id,
        fechaVencimiento: req.body.fechaSalida,
        correo: req.body.correo,
        nombre: req.body.numero,
        vuelo: `Vuelo desde ${req.body.aeropuertoOrigen} con destino a ${req.body.aeropuertoDestino}`
    }

    const crearColumnas = Object.values(nuevosTicket).join(', ');

    conexion.query(`CREATE TABLE IF NOT EXISTS tabla_tickets (${crearColumnas})`, (error, row) => {
        if (error) {
            console.log("*Ocurrio un error al ingresar la base de datos! ", error.message);
        } else {

            conexion.query('INSERT INTO tabla_tickets SET ?', [datosTicket], (error) => {
                if (error) {
                    console.log("*Ocurrio un error al realizar la consulta! ", error.message);
                } else {
                    let usuario = {
                        nombre: req.body.nombre,
                        pais: req.body.pais,
                        tipoDocumento: req.body.tipoDocumento,
                        documento: req.body.documento,
                        correo: req.body.correo,
                        contrasena: req.body.contrasena
                    }

                    crearTablaTicket(tickets, req.body.correo);

                    conexion.query("SELECT * FROM tabla_vuelos WHERE id = ?", [datos], (error, row) => {
                        if (error) {
                            console.log("*Ocurrio un error al realizar la consulta! ", error.message);
                        } else {

                            row[0].asientos--;

                            conexion.query("UPDATE tabla_vuelos SET asientos = ? WHERE id = ?", [row[0].asientos, row[0].id], (error) => {
                                if (error) {
                                    console.log("*Ocurrio un error al actualizar los datos! ", error.message);
                                } else {

                                    res.render('Aerolinea', { vuelo, vuelos, usuario, titulo: req.body.nombre, datosTicket, tickets });

                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

app.post('/salir', (req, res) => {
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Aeroline app listening at http://localhost:${port}`);
});