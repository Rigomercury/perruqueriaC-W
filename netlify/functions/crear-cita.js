/* =========================================================
   crear-cita.js — Netlify Function
   Recibe los datos del formulario de citas y:
   1. Valida los campos obligatorios en el servidor.
   2. Intenta guardar la cita en Supabase.
      - Si la fecha+hora ya está ocupada, la base de datos
        rechaza la inserción (columna UNIQUE) y avisamos al
        usuario en vez de crear un doble agendamiento.
   3. Si se guarda con éxito, envía dos correos con Resend:
      - Uno a la dueña/o del negocio (NOTIFY_EMAIL).
      - Uno al cliente, confirmando que recibimos su solicitud.
   ========================================================= */

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Mientras no verifiques un dominio propio en Resend, los correos
// deben enviarse desde esta dirección de prueba, y solo llegan
// a la casilla con la que creaste tu cuenta de Resend.
const FROM_EMAIL = 'Cosmo & Wanda <onboarding@resend.dev>';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Datos inválidos' }) };
  }

  const { ownerName, petName, breed, service, phone, email, date, time, comments } = data;

  const required = { ownerName, petName, service, phone, email, date, time };
  for (const [key, value] of Object.entries(required)) {
    if (!value || !String(value).trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: `Falta el campo: ${key}` }) };
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Correo inválido' }) };
  }

  const { data: cita, error } = await supabase
    .from('citas')
    .insert([{
      owner_name: ownerName,
      pet_name: petName,
      breed: breed || null,
      service,
      phone,
      email,
      fecha: date,
      hora: time,
      comments: comments || null,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Esa fecha y hora ya están reservadas. Elige otro horario.' }),
      };
    }
    console.error('Error de Supabase:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo guardar la cita. Intenta de nuevo.' }) };
  }

  try {
    if (process.env.NOTIFY_EMAIL) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: process.env.NOTIFY_EMAIL,
        subject: `Nueva solicitud de cita — ${petName}`,
        html: `
          <h2>Nueva solicitud de cita</h2>
          <p><strong>Dueño/a:</strong> ${ownerName}</p>
          <p><strong>Mascota:</strong> ${petName} (${breed || 'raza no indicada'})</p>
          <p><strong>Servicio:</strong> ${service}</p>
          <p><strong>Teléfono:</strong> ${phone}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Fecha:</strong> ${date} — <strong>Hora:</strong> ${time}</p>
          <p><strong>Comentarios:</strong> ${comments || '—'}</p>
        `,
      });
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Recibimos tu solicitud de cita — Cosmo & Wanda',
      html: `
        <h2>¡Hola ${ownerName}!</h2>
        <p>Recibimos tu solicitud de cita para <strong>${petName}</strong> el
        <strong>${date}</strong> a las <strong>${time}</strong>.</p>
        <p>Te escribiremos pronto para confirmarla. Si tienes dudas, contáctanos
        al teléfono que aparece en nuestro sitio.</p>
        <p>¡Gracias por confiar en Cosmo &amp; Wanda! 🐾</p>
      `,
    });
  } catch (emailError) {
    console.error('Error enviando correo:', emailError);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, cita }),
  };
};