$(document).ready(function () {
  $('#buscar').on('click', function () {
    const data = $('#data').val();

    if (!data) {
      alert('Por favor, selecione uma data.');
      return;
    }

    $('#resultado').text('🔄 Buscando AFDs em todos os relógios...');

    fetch('/api/afd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: data })
    })
      .then(res => res.json())
      .then(({ arquivos }) => {
        if (!arquivos || arquivos.length === 0) {
          $('#resultado').text('⚠️ Nenhum AFD encontrado.');
          return;
        }

        arquivos.forEach(nome => {
          const a = document.createElement('a');
          a.href = `/downloads/${nome}`;
          a.download = nome;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });

        $('#resultado').text(`✅ ${arquivos.length} arquivos AFD baixados.`);
      })
      .catch(err => {
        $('#resultado').text('❌ Erro: ' + err.message);
      });
  });
});
