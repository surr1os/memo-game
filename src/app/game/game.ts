import {Component, OnInit, signal, computed, Signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Card} from './models/card';

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.html',
  styleUrl: './game.scss',
  standalone: true
})
export class Game implements OnInit {
  // Сигналы для состояния игры
  cards = signal<Card[]>([]);
  flippedCards = signal<Card[]>([]);
  currentPlayer = signal<1 | 2>(1);
  scores = signal({ player1: 0, player2: 0 });
  isGameOver = signal(false);
  canClick = signal(true);
  showNotification = signal(false);
  notificationMessage = signal('');
  isProcessingMatch = signal(false);

  // Вычисляемые сигналы
  player1Score = computed(() => this.scores().player1);
  player2Score = computed(() => this.scores().player2);
  currentPlayerName = computed(() => `Игрок ${this.currentPlayer()}`);
  isPlayer1Turn = computed(() => this.currentPlayer() === 1);
  isPlayer2Turn = computed(() => this.currentPlayer() === 2);

  // Сообщение о победителе
  winnerMessage = computed(() => {
    const scores = this.scores();
    if (scores.player1 > scores.player2) {
      return 'Игрок 1 победил! 🎉';
    } else if (scores.player2 > scores.player1) {
      return 'Игрок 2 победил! 🎉';
    } else {
      return 'Ничья! 🤝';
    }
  });

  // Проверка конца игры
  allCardsMatched = computed(() =>
    this.cards().every(card => card.isMatched)
  );

  cardImages = [
    '/assets/image1.jpg',
    '/assets/image2.jpg',
    '/assets/image3.jpg'
  ];

  ngOnInit() {
    this.initializeGame();
  }

  initializeGame() {
    this.cards.set([]);
    this.flippedCards.set([]);
    this.currentPlayer.set(1);
    this.scores.set({ player1: 0, player2: 0 });
    this.isGameOver.set(false);
    this.showNotification.set(false);
    this.canClick.set(true);
    this.isProcessingMatch.set(false);

    const pairs: { image: string, pairId: number }[] = [];

    this.cardImages.forEach((image, index) => {
      pairs.push({ image, pairId: index });
      pairs.push({ image, pairId: index });
    });

    const newCards = pairs.map((pair, index) => ({
      id: index,
      image: pair.image,
      isFlipped: false,
      isMatched: false,
      pairId: pair.pairId
    }));

    this.cards.set(this.shuffleCards(newCards));
  }

  shuffleCards(cards: Card[]): Card[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  flipCard(card: Card) {
    if (!this.canClick() ||
      card.isFlipped ||
      card.isMatched ||
      this.flippedCards().length >= 2 ||
      this.isGameOver() ||
      this.isProcessingMatch()) {
      return;
    }

    // Обновляем карточку в массиве
    this.updateCardFlippedState(card.id, true);

    // Добавляем в перевернутые карточки
    const updatedCard = { ...card, isFlipped: true };
    this.flippedCards.update(cards => [...cards, updatedCard]);

    if (this.flippedCards().length === 2) {
      this.canClick.set(false);
      this.isProcessingMatch.set(true);

      // Ждем, пока обе карточки перевернутся
      setTimeout(() => {
        this.processAfterFlip();
      }, 100);
    }
  }

  updateCardFlippedState(cardId: number, isFlipped: boolean) {
    this.cards.update(cards =>
      cards.map(card =>
        card.id === cardId ? { ...card, isFlipped } : card
      )
    );
  }

  updateCardMatchedState(cardId: number, isMatched: boolean) {
    this.cards.update(cards =>
      cards.map(card =>
        card.id === cardId ? { ...card, isMatched } : card
      )
    );
  }

  processAfterFlip() {
    const [card1, card2] = this.flippedCards();

    if (card1.pairId === card2.pairId) {
      this.showMatchResult(card1, card2, true);
    } else {
      this.showMatchResult(card1, card2, false);
    }
  }

  showMatchResult(card1: Card, card2: Card, isMatch: boolean) {
    if (isMatch) {
      // Даем увидеть совпадение
      setTimeout(() => {
        // Помечаем как найденные
        this.updateCardMatchedState(card1.id, true);
        this.updateCardMatchedState(card2.id, true);

        // Начисляем очки
        if (this.currentPlayer() === 1) {
          this.scores.update(scores => ({
            ...scores,
            player1: scores.player1 + 1
          }));
        } else {
          this.scores.update(scores => ({
            ...scores,
            player2: scores.player2 + 1
          }));
        }

        this.showNotificationMessage('Пара найдена! +1 очко');
        this.finishTurn(true);
      }, 100);
    } else {
      // Даем увидеть несовпадение
      setTimeout(() => {
        // Переворачиваем карточки обратно
        this.updateCardFlippedState(card1.id, false);
        this.updateCardFlippedState(card2.id, false);

        // Меняем игрока
        this.currentPlayer.update(player => player === 1 ? 2 : 1);

        this.showNotificationMessage('Карточки не совпали! Ход переходит следующему игроку');

        // Ждем завершения анимации переворота обратно
        setTimeout(() => {
          this.finishTurn(false);
        }, 300);
      }, 300);
    }
  }

  finishTurn(wasMatchFound: boolean) {
    // Очищаем массив
    this.flippedCards.set([]);

    // Разрешаем клики
    this.canClick.set(true);
    this.isProcessingMatch.set(false);

    if (wasMatchFound) {
      this.checkGameOver();
    }
  }

  showNotificationMessage(message: string) {
    this.notificationMessage.set(message);
    this.showNotification.set(true);

    setTimeout(() => {
      this.showNotification.set(false);
    }, 1500);
  }

  checkGameOver() {
    if (this.allCardsMatched()) {
      setTimeout(() => {
        this.isGameOver.set(true);
        this.canClick.set(false);
      }, 500);
    }
  }

  resetGame() {
    this.initializeGame();
  }
}
