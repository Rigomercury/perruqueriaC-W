/* =========================================================
   disponibilidad.js — Netlify Function
   Recibe una fecha (?fecha=2026-07-10) y devuelve qué horas
   de las 4 disponibles (10:00, 12:00, 14:00, 16:00) ya están
   ocupadas ese día, para que el formulario las deshabilite.
   ========================================================= */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  const fecha = event.queryStringParameters?.fecha;
  if (!fecha) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta la fecha' }) };
  }

  const { data, error } = await supabase
    .from('citas')
    .select('hora')
    .eq('fecha', fecha);

  if (error) {
    console.error('Error consultando disponibilidad:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo consultar la disponibilidad' }) };
  }

  // Supabase devuelve la hora como "10:00:00", normalizamos a "10:00"
  const ocupadas = data.map(row => row.hora.slice(0, 5));

  return {
    statusCode: 200,
    body: JSON.stringify({ ocupadas }),
  };
};