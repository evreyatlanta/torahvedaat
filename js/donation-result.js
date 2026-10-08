const result = new URLSearchParams(location.search).get('result');
const title = document.getElementById('donation-result-title');
const message = document.getElementById('donation-result-message');
if (result === 'cancel') {
    title.textContent = 'Пожертвование отменено';
    message.textContent = 'Оформление пожертвования отменено. Если захотите попробовать снова, воспользуйтесь кнопкой Donate в шапке сайта.';
} else if (result === 'success') {
    title.textContent = 'Спасибо за поддержку!';
    message.textContent = 'Спасибо за поддержку нашей общины. Подтверждение платежа и квитанцию отправляет PayPal на вашу электронную почту.';
}
