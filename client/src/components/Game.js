import React, {useEffect, useState} from 'react'
import PACK_OF_CARDS from '../utils/packOfCards'
import shuffleArray from '../utils/shuffleArray'
import io from 'socket.io-client'
import queryString from 'query-string'
import Spinner from './Spinner'
import useSound from 'use-sound'

import bgMusic from '../assets/sounds/game-bg-music.mp3'
import unoSound from '../assets/sounds/uno-sound.mp3'
import shufflingSound from '../assets/sounds/shuffling-cards-1.mp3'
import skipCardSound from '../assets/sounds/skip-sound.mp3'
import draw2CardSound from '../assets/sounds/draw2-sound.mp3'
import wildCardSound from '../assets/sounds/wild-sound.mp3'
import draw4CardSound from '../assets/sounds/draw4-sound.mp3'
import gameOverSound from '../assets/sounds/game-over-sound.mp3'

//NUMBER CODES FOR ACTION CARDS
//SKIP - 404
//DRAW 2 - 252
//WILD - 300
//DRAW 4 WILD - 600

let socket
// const ENDPOINT = 'http://localhost:5000'
const ENDPOINT = 'https://uno-online-multiplayer.herokuapp.com/'
const playerSynthesis = ["1b", "2c", 0, 0];
const Game = (props) => {
    const data = queryString.parse(props.location.search)

    //initialize socket state
    const [room, setRoom] = useState(data.roomCode)
    const [roomFull, setRoomFull] = useState(false)
    const [users, setUsers] = useState([])
    const [currentUser, setCurrentUser] = useState('')
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])

    useEffect(() => {
        const connectionOptions = {
            "forceNew": true,
            "reconnectionAttempts": "Infinity",
            "timeout": 10000,
            "transports": ["websocket"]
        }
        socket = io.connect(ENDPOINT, connectionOptions)

        socket.emit('join', {room: room}, (error) => {
            if (error)
                setRoomFull(true)
        })

        //cleanup on component unmount
        return function cleanup() {
            socket.emit('disconnect')
            //shut down connnection instance
            socket.off()
        }
    }, [])

    //initialize game state
    const [gameOver, setGameOver] = useState(true)
    const [winner, setWinner] = useState('')
    const [turn, setTurn] = useState('')
    const [player1Deck, setPlayer1Deck] = useState([])
    const [player2Deck, setPlayer2Deck] = useState([])
    const [currentColor, setCurrentColor] = useState('')
    const [currentNumber, setCurrentNumber] = useState('')
    const [playedCardsPile, setPlayedCardsPile] = useState([])
    const [drawCardPile, setDrawCardPile] = useState([])
    const [playerChoice, setPlayerChoice] = useState([])


    const [isChatBoxHidden, setChatBoxHidden] = useState(true)
    const [isUnoButtonPressed, setUnoButtonPressed] = useState(false)
    const [isSoundMuted, setSoundMuted] = useState(false)
    const [isMusicMuted, setMusicMuted] = useState(true)

    const [playBBgMusic, {pause}] = useSound(bgMusic, {loop: true})
    const [playUnoSound] = useSound(unoSound)
    const [playShufflingSound] = useSound(shufflingSound)
    const [playSkipCardSound] = useSound(skipCardSound)
    const [playDraw2CardSound] = useSound(draw2CardSound)
    const [playWildCardSound] = useSound(wildCardSound)
    const [playDraw4CardSound] = useSound(draw4CardSound)
    const [playGameOverSound] = useSound(gameOverSound)

    //runs once on component mount
    useEffect(() => {
        //shuffle PACK_OF_CARDS array
        const shuffledCards = shuffleArray(PACK_OF_CARDS)

        //extract first 7 elements to player1Deck
        const player1Deck = shuffledCards.splice(0, 7)

        //extract first 7 elements to player2Deck
        const player2Deck = shuffledCards.splice(0, 7)

        //extract random card from shuffledCards and check if its not an action card
        let startingCardIndex
        while (true) {
            //choice game begin card
            startingCardIndex = Math.floor(Math.random() * 20)
            break;
        }

        //extract the card from that startingCardIndex into the playedCardsPile
        const playedCardsPile = shuffledCards.splice(startingCardIndex, 1)

        //store all remaining cards into drawCardPile
        const drawCardPile = shuffledCards

        //send initial state to server
        socket.emit('initGameState', {
            gameOver: false,
            turn: 'Player 2',
            player1Deck: [...player1Deck],
            player2Deck: [...player2Deck],
            currentColor: playedCardsPile[0].charAt(1),
            currentNumber: playedCardsPile[0].charAt(0),
            playedCardsPile: [...playedCardsPile],
            drawCardPile: [...drawCardPile]
        })
    }, [])

    useEffect(() => {
        socket.on('initGameState', ({
                                        gameOver,
                                        turn,
                                        player1Deck,
                                        player2Deck,
                                        currentColor,
                                        currentNumber,
                                        playedCardsPile,
                                        drawCardPile
                                    }) => {
            setGameOver(gameOver)
            setTurn(turn)
            setPlayer1Deck(player1Deck)
            setPlayer2Deck(player2Deck)
            setCurrentColor(currentColor)
            setCurrentNumber(currentNumber)
            setPlayedCardsPile(playedCardsPile)
            setDrawCardPile(drawCardPile)
        })

        socket.on('updateGameState', ({
                                          gameOver,
                                          winner,
                                          turn,
                                          player1Deck,
                                          player2Deck,
                                          currentColor,
                                          currentNumber,
                                          playedCardsPile,
                                          drawCardPile
                                      }) => {
            gameOver && setGameOver(gameOver)
            gameOver === true && playGameOverSound()
            winner && setWinner(winner)
            turn && setTurn(turn)
            player1Deck && setPlayer1Deck(player1Deck)
            player2Deck && setPlayer2Deck(player2Deck)
            currentColor && setCurrentColor(currentColor)
            currentNumber && setCurrentNumber(currentNumber)
            playedCardsPile && setPlayedCardsPile(playedCardsPile)
            drawCardPile && setDrawCardPile(drawCardPile)
            setUnoButtonPressed(false)
        })

        socket.on("roomData", ({users}) => {
            setUsers(users)
        })

        socket.on('currentUserData', ({name}) => {
            setCurrentUser(name)
        })
        socket.on('choiceCard', ({playerChoice}) => {
            setPlayerChoice(playerChoice)
        })
        socket.on('message', message => {
            setMessages(messages => [...messages, message])

            const chatBody = document.querySelector('.chat-body')
            chatBody.scrollTop = chatBody.scrollHeight
        })
    }, [])

    //some util functions
    const checkGameOver = (arr) => {
        let a = 0
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === "3R" || arr[i] === "3B" || arr[i] === "3G" || arr[i] === "3Y" || arr[i] === "3P" || arr[i] === "3O") {
                a++;
            }
        }
        return a === 6
    }

    const checkWinner = (arr, player) => {
        let a = 0
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === "3R" || arr[i] === "3B" || arr[i] === "3G" || arr[i] === "3Y" || arr[i] === "3P" || arr[i] === "3O") {
                a++;
            }
        }
        return a === 6 ? player : ''
    }

    const toggleChatBox = () => {
        const chatBody = document.querySelector('.chat-body')
        if (isChatBoxHidden) {
            chatBody.style.display = 'block'
            setChatBoxHidden(false)
        } else {
            chatBody.style.display = 'none'
            setChatBoxHidden(true)
        }
    }

    const sendMessage = (event) => {
        event.preventDefault()
        if (message) {
            socket.emit('sendMessage', {message: message}, () => {
                setMessage('')
            })
        }
    }

    //This is function about end of round
    const EndofRound = () => {
        const cardDrawnBy = turn
        const copiedDrawCardPileArray = [...drawCardPile]
        // draw two cards to next player
        const drawCard1 = copiedDrawCardPileArray.pop()
        const drawCard2 = copiedDrawCardPileArray.pop()

        !isSoundMuted && playShufflingSound()

        if (cardDrawnBy === 'Player 2') {
            socket.emit('updateGameState', {
                gameOver: checkGameOver(player2Deck),
                winner: checkWinner(player2Deck, 'Player 2'),
                turn: 'Player 1',
                player1Deck: [...player1Deck.slice(0, player1Deck.length), drawCard1, drawCard2, ...player1Deck.slice(player1Deck.length)],

            })
        }
        if (cardDrawnBy === 'Player 1') {
            socket.emit('updateGameState', {
                gameOver: checkGameOver(player1Deck),
                winner: checkWinner(player1Deck, 'Player 1'),
                turn: 'Player 2',
                player2Deck: [...player2Deck.slice(0, player2Deck.length), drawCard1, drawCard2, ...player2Deck.slice(player2Deck.length)],

            })
        }


    }

    const onCardPlayedHandler = (played_card, fen) => {
        //extract player who played the card
        const cardPlayedBy = turn
        // fen is ti divied two class of  fenjie
        if (fen == 1) {

            switch (played_card) {
                //if card played was a number card
                case '2B':
                case '2G':
                case '2O':
                case '2P':
                case '2R':
                case '2Y': {
                    //extract number and color of played card

                    const numberOfPlayedCard = played_card.charAt(0)
                    const colorOfPlayedCard = played_card.charAt(1)
                    //check for color match

                    console.log('colors matched!')
                    //check who played the card and return new state accordingly
                    if (cardPlayedBy === 'Player 1') {
                        //remove the played card from player1's deck and add it to playedCardsPile (immutably)
                        //then update turn, currentColor and currentNumber
                        const removeIndex = player1Deck.indexOf(played_card)
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                        const copiedDrawCardPileArray = [...drawCardPile]
                        //pull out last two elements from it
                        const drawCard1 = "1" + colorOfPlayedCard
                        const drawCard2 = "1" + colorOfPlayedCard
                        const updatedPlayer1Deck = [...player1Deck.slice(0, removeIndex), ...player1Deck.slice(removeIndex + 1)]
                        updatedPlayer1Deck.push(drawCard1)
                        updatedPlayer1Deck.push(drawCard2)
                        !isSoundMuted && playShufflingSound()
                        //send new state to server
                        socket.emit('updateGameState', {
                            gameOver: checkGameOver(player1Deck),
                            winner: checkWinner(player1Deck, 'Player 1'),
                            turn: 'Player 1',
                            playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card, ...playedCardsPile.slice(playedCardsPile.length)],
                            player1Deck: [...updatedPlayer1Deck],
                            currentColor: colorOfPlayedCard,
                            currentNumber: numberOfPlayedCard,
                            drawCardPile: [...copiedDrawCardPileArray]
                        })


                    } else {
                        //remove the played card from player2's deck and add it to playedCardsPile (immutably)
                        //then update turn, currentColor and currentNumber
                        const removeIndex = player2Deck.indexOf(played_card)
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                        const copiedDrawCardPileArray = [...drawCardPile]
                        //pull out last two elements from it
                        const drawCard1 = "1" + colorOfPlayedCard
                        const drawCard2 = "1" + colorOfPlayedCard
                        const updatedPlayer2Deck = [...player2Deck.slice(0, removeIndex), ...player2Deck.slice(removeIndex + 1)]
                        updatedPlayer2Deck.push(drawCard1)
                        updatedPlayer2Deck.push(drawCard2)
                        !isSoundMuted && playShufflingSound()
                        //send new state to server
                        socket.emit('updateGameState', {
                            gameOver: checkGameOver(player2Deck),
                            winner: checkWinner(player2Deck, 'Player 2'),
                            turn: 'Player 2',
                            playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card, ...playedCardsPile.slice(playedCardsPile.length)],
                            player2Deck: [...updatedPlayer2Deck],
                            currentColor: colorOfPlayedCard,
                            currentNumber: numberOfPlayedCard,
                            drawCardPile: [...copiedDrawCardPileArray]
                        })


                    }

                    break;
                }

                case '3B':
                case '3G':
                case '3O':
                case '3P':
                case '3R':
                case '3Y': {
                    //extract number and color of played card

                    const numberOfPlayedCard = played_card.charAt(0)
                    const colorOfPlayedCard = played_card.charAt(1)
                    //check for color match

                    console.log('colors matched!')
                    //check who played the card and return new state accordingly
                    if (cardPlayedBy === 'Player 1') {
                        //remove the played card from player1's deck and add it to playedCardsPile (immutably)
                        //then update turn, currentColor and currentNumber
                        const removeIndex = player1Deck.indexOf(played_card)
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                        const copiedDrawCardPileArray = [...drawCardPile]
                        //pull out last two elements from it
                        const drawCard1 = "1" + colorOfPlayedCard
                        const drawCard2 = "2" + colorOfPlayedCard
                        const updatedPlayer1Deck = [...player1Deck.slice(0, removeIndex), ...player1Deck.slice(removeIndex + 1)]
                        updatedPlayer1Deck.push(drawCard1)
                        updatedPlayer1Deck.push(drawCard2)
                        !isSoundMuted && playShufflingSound()
                        //send new state to server
                        socket.emit('updateGameState', {
                            gameOver: checkGameOver(player1Deck),
                            winner: checkWinner(player1Deck, 'Player 1'),
                            turn: 'Player 1',
                            playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card, ...playedCardsPile.slice(playedCardsPile.length)],
                            player1Deck: [...updatedPlayer1Deck],
                            currentColor: colorOfPlayedCard,
                            currentNumber: numberOfPlayedCard,
                            drawCardPile: [...copiedDrawCardPileArray]
                        })


                    } else {
                        //remove the played card from player2's deck and add it to playedCardsPile (immutably)
                        //then update turn, currentColor and currentNumber
                        const removeIndex = player2Deck.indexOf(played_card)
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                        const copiedDrawCardPileArray = [...drawCardPile]
                        //pull out last two elements from it
                        const drawCard1 = "1" + colorOfPlayedCard
                        const drawCard2 = "2" + colorOfPlayedCard
                        const updatedPlayer2Deck = [...player2Deck.slice(0, removeIndex), ...player2Deck.slice(removeIndex + 1)]
                        updatedPlayer2Deck.push(drawCard1)
                        updatedPlayer2Deck.push(drawCard2)
                        !isSoundMuted && playShufflingSound()
                        //send new state to server
                        socket.emit('updateGameState', {
                            gameOver: checkGameOver(player2Deck),
                            winner: checkWinner(player2Deck, 'Player 2'),
                            turn: 'Player 2',
                            playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card, ...playedCardsPile.slice(playedCardsPile.length)],
                            player2Deck: [...updatedPlayer2Deck],
                            currentColor: colorOfPlayedCard,
                            currentNumber: numberOfPlayedCard,
                            drawCardPile: [...copiedDrawCardPileArray]
                        })


                    }

                    break;
                }

                case '1G':
                case '1O':
                case '1P':
                case '1B':
                case '1R':
                case '1Y': {
                    alert("invaid move")
                }
            }
        } else if (fen == 3) {

            const numberOfPlayedCard0 = played_card[0].charAt(0)
            const colorOfPlayedCard0 = played_card[0].charAt(1)
            const numberOfPlayedCard1 = played_card[1].charAt(0)
            const colorOfPlayedCard1 = played_card[1].charAt(1)
            if (colorOfPlayedCard0 == colorOfPlayedCard1 && ((numberOfPlayedCard0 == "1" && numberOfPlayedCard1 == "1") || (numberOfPlayedCard1 == "2" && numberOfPlayedCard0 == "1") || (numberOfPlayedCard1 == "1" && numberOfPlayedCard0 == "2"))) {
                if (cardPlayedBy === 'Player 1') {
                    //remove the played card from player1's deck and add it to playedCardsPile (immutably)
                    //then update turn, currentColor and currentNumber
                    let removeIndex1 = player1Deck.indexOf(played_card[0])
                    let removeIndex2 = player1Deck.indexOf(played_card[1])
                    //pull out last two elements from it

                    let drawCard1 = numberOfPlayedCard0 + "R"
                    if ((numberOfPlayedCard1 == "2" && numberOfPlayedCard0 == "1") || (numberOfPlayedCard1 == "1" && numberOfPlayedCard0 == "2")) {
                        drawCard1 = "3" + colorOfPlayedCard0
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                    } else {
                        drawCard1 = "2" + colorOfPlayedCard0
                        removeIndex1 = player1Deck.indexOf(played_card[0])
                        const fenzu = player1Deck.slice(removeIndex1 + 1, player1Deck.length - 1)
                        removeIndex2 = fenzu.indexOf(played_card[1]) + removeIndex1 + 1
                        alert(removeIndex2)
                    }
                    if (removeIndex1 > removeIndex2) {
                        const jiao = removeIndex2
                        removeIndex2 = removeIndex1
                        removeIndex1 = jiao
                    }

                    const copiedDrawCardPileArray = [...drawCardPile]
                    const updatedplayer1Deck = [...player1Deck.slice(0, removeIndex1), ...player1Deck.slice(removeIndex1 + 1, removeIndex2), ...player1Deck.slice(removeIndex2 + 1)]
                    updatedplayer1Deck.push(drawCard1)
                    !isSoundMuted && playShufflingSound()
                    //send new state to server
                    socket.emit('updateGameState', {
                        gameOver: checkGameOver(player1Deck),
                        winner: checkWinner(player1Deck, 'Player 1'),
                        turn: 'Player 1',
                        playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card[0], played_card[1], ...playedCardsPile.slice(playedCardsPile.length)],
                        player1Deck: [...updatedplayer1Deck],
                        currentColor: colorOfPlayedCard1,
                        currentNumber: numberOfPlayedCard1,
                        drawCardPile: [...copiedDrawCardPileArray]
                    })


                } else {
                    //remove the played card from player2's deck and add it to playedCardsPile (immutably)
                    //then update turn, currentColor and currentNumber
                    let removeIndex1 = player2Deck.indexOf(played_card[0])
                    let removeIndex2 = player2Deck.indexOf(played_card[1])
                    //pull out last two elements from it

                    let drawCard1 = numberOfPlayedCard0 + "R"
                    if ((numberOfPlayedCard1 == "2" && numberOfPlayedCard0 == "1") || (numberOfPlayedCard1 == "1" && numberOfPlayedCard0 == "2")) {
                        drawCard1 = "3" + colorOfPlayedCard0
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                    } else {
                        drawCard1 = "2" + colorOfPlayedCard0
                        removeIndex1 = player2Deck.indexOf(played_card[0])
                        const fenzu = player2Deck.slice(removeIndex1 + 1, player2Deck.length - 1)
                        removeIndex2 = fenzu.indexOf(played_card[1]) + removeIndex1 + 1
                        alert(removeIndex2)
                    }
                    if (removeIndex1 > removeIndex2) {
                        const jiao = removeIndex2
                        removeIndex2 = removeIndex1
                        removeIndex1 = jiao
                    }

                    const copiedDrawCardPileArray = [...drawCardPile]
                    const updatedplayer2Deck = [...player2Deck.slice(0, removeIndex1), ...player2Deck.slice(removeIndex1 + 1, removeIndex2), ...player2Deck.slice(removeIndex2 + 1)]
                    updatedplayer2Deck.push(drawCard1)
                    !isSoundMuted && playShufflingSound()
                    //send new state to server
                    socket.emit('updateGameState', {
                        gameOver: checkGameOver(player2Deck),
                        winner: checkWinner(player2Deck, 'Player 2'),
                        turn: 'Player 2',
                        playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card[0], played_card[1], ...playedCardsPile.slice(playedCardsPile.length)],
                        player2Deck: [...updatedplayer2Deck],
                        currentColor: colorOfPlayedCard1,
                        currentNumber: numberOfPlayedCard1,
                        drawCardPile: [...copiedDrawCardPileArray]
                    })

                }
            }
        } else if (fen == 4) {

            const numberOfPlayedCard0 = played_card[0].charAt(0)
            const colorOfPlayedCard0 = played_card[0].charAt(1)
            const numberOfPlayedCard1 = played_card[1].charAt(0)
            const colorOfPlayedCard1 = played_card[1].charAt(1)
            if (numberOfPlayedCard0 == numberOfPlayedCard1 && ((colorOfPlayedCard0 == "R" && colorOfPlayedCard1 == "Y") || (colorOfPlayedCard0 == "Y" && colorOfPlayedCard1 == "B") || (colorOfPlayedCard0 == "B" && colorOfPlayedCard1 == "R") || (colorOfPlayedCard1 == "R" && colorOfPlayedCard0 == "Y") || (colorOfPlayedCard1 == "Y" && colorOfPlayedCard0 == "B") || (colorOfPlayedCard1 == "B" && colorOfPlayedCard0 == "R"))) {
                if (cardPlayedBy === 'Player 1') {
                    //remove the played card from player1's deck and add it to playedCardsPile (immutably)
                    //then update turn, currentColor and currentNumber
                    let removeIndex1 = player1Deck.indexOf(played_card[0])
                    let removeIndex2 = player1Deck.indexOf(played_card[1])
                    //if two cards remaining check if player pressed UNO button
                    //if not pressed add 2 cards as penalty
                    //make a copy of drawCardPile array
                    const copiedDrawCardPileArray = [...drawCardPile]
                    //pull out last two elements from it
                    let drawCard1 = numberOfPlayedCard0 + "R"
                    if ((colorOfPlayedCard0 == "R" && colorOfPlayedCard1 == "Y") || (colorOfPlayedCard1 == "R" && colorOfPlayedCard0 == "Y")) {
                        drawCard1 = numberOfPlayedCard0 + "O"
                    } else if ((colorOfPlayedCard0 == "Y" && colorOfPlayedCard1 == "B") || (colorOfPlayedCard1 == "Y" && colorOfPlayedCard0 == "B")) {
                        drawCard1 = numberOfPlayedCard0 + "G"
                    } else if ((colorOfPlayedCard0 == "B" && colorOfPlayedCard1 == "R") || (colorOfPlayedCard1 == "R" && colorOfPlayedCard0 == "B")) {
                        drawCard1 = numberOfPlayedCard0 + "P"
                    }
                    if (removeIndex1 > removeIndex2) {
                        const jiao = removeIndex2
                        removeIndex2 = removeIndex1
                        removeIndex1 = jiao
                    }
                    alert(drawCard1)
                    const updatedPlayer1Deck = [...player1Deck.slice(0, removeIndex1), ...player1Deck.slice(removeIndex1 + 1, removeIndex2), ...player1Deck.slice(removeIndex2 + 1)]
                    updatedPlayer1Deck.push(drawCard1)
                    !isSoundMuted && playShufflingSound()
                    //send new state to server
                    socket.emit('updateGameState', {
                        gameOver: checkGameOver(player1Deck),
                        winner: checkWinner(player1Deck, 'Player 1'),
                        turn: 'Player 1',
                        playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card[0], played_card[1], ...playedCardsPile.slice(playedCardsPile.length)],
                        player1Deck: [...updatedPlayer1Deck],
                        currentColor: colorOfPlayedCard1,
                        currentNumber: numberOfPlayedCard1,
                        drawCardPile: [...copiedDrawCardPileArray]
                    })


                } else {
                    //remove the played card from player2's deck and add it to playedCardsPile (immutably)
                    //then update turn, currentColor and currentNumber
                    let removeIndex1 = player2Deck.indexOf(played_card[0])
                    let removeIndex2 = player2Deck.indexOf(played_card[1])
                    //if two cards remaining check if player pressed UNO button
                    //if not pressed add 2 cards as penalty
                    //make a copy of drawCardPile array
                    const copiedDrawCardPileArray = [...drawCardPile]
                    //pull out last two elements from it

                    let drawCard1 = numberOfPlayedCard0 + "R"
                    if ((colorOfPlayedCard0 == "R" && colorOfPlayedCard1 == "Y") || (colorOfPlayedCard1 == "R" && colorOfPlayedCard0 == "Y")) {
                        drawCard1 = numberOfPlayedCard0 + "O"
                    } else if ((colorOfPlayedCard0 == "Y" && colorOfPlayedCard1 == "B") || (colorOfPlayedCard1 == "Y" && colorOfPlayedCard0 == "B")) {
                        drawCard1 = numberOfPlayedCard0 + "G"
                    } else if ((colorOfPlayedCard0 == "B" && colorOfPlayedCard1 == "R") || (colorOfPlayedCard1 == "R" && colorOfPlayedCard0 == "B")) {
                        drawCard1 = numberOfPlayedCard0 + "P"
                    }
                    if (removeIndex1 > removeIndex2) {
                        const jiao = removeIndex2
                        removeIndex2 = removeIndex1
                        removeIndex1 = jiao
                    }
                    alert(colorOfPlayedCard0)
                    const updatedPlayer1Deck = [...player2Deck.slice(0, removeIndex1), ...player2Deck.slice(removeIndex1 + 1, removeIndex2), ...player2Deck.slice(removeIndex2 + 1)]
                    updatedPlayer1Deck.push(drawCard1)
                    !isSoundMuted && playShufflingSound()
                    //send new state to server
                    socket.emit('updateGameState', {
                        gameOver: checkGameOver(player2Deck),
                        winner: checkWinner(player2Deck, 'Player 2'),
                        turn: 'Player 2',
                        playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card[0], played_card[1], ...playedCardsPile.slice(playedCardsPile.length)],
                        player2Deck: [...updatedPlayer1Deck],
                        currentColor: colorOfPlayedCard1,
                        currentNumber: numberOfPlayedCard1,
                        drawCardPile: [...copiedDrawCardPileArray]
                    })
                }
            }
        } else if (fen == 2) {
            switch (played_card) {
                //if card played was a number card

                case '2G':
                case '2O':
                case '2P':
                case '1G':
                case '1O':
                case '1P':
                case '3G':
                case '3O':
                case '3P': {
                    //extract number and color of played card

                    const numberOfPlayedCard = played_card.charAt(0)
                    const colorOfPlayedCard = played_card.charAt(1)
                    //check for color match

                    console.log('colors matched!')
                    //check who played the card and return new state accordingly
                    if (cardPlayedBy === 'Player 1') {
                        //remove the played card from player1's deck and add it to playedCardsPile (immutably)
                        //then update turn, currentColor and currentNumber
                        const removeIndex = player1Deck.indexOf(played_card)
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                        const copiedDrawCardPileArray = [...drawCardPile]
                        //pull out last two elements from it
                        const drawCard1 = numberOfPlayedCard + "R"
                        const drawCard2 = numberOfPlayedCard + "Y"
                        if (colorOfPlayedCard === "O") {
                            const drawCard1 = numberOfPlayedCard + "R"
                            const drawCard2 = numberOfPlayedCard + "Y"
                        } else if (colorOfPlayedCard === "P") {
                            const drawCard1 = numberOfPlayedCard + "R"
                            const drawCard2 = numberOfPlayedCard + "B"
                        } else if (colorOfPlayedCard === "G") {
                            const drawCard1 = numberOfPlayedCard + "Y"
                            const drawCard2 = numberOfPlayedCard + "B"
                        }
                        const updatedPlayer1Deck = [...player1Deck.slice(0, removeIndex), ...player1Deck.slice(removeIndex + 1)]
                        updatedPlayer1Deck.push(drawCard1)
                        updatedPlayer1Deck.push(drawCard2)
                        !isSoundMuted && playShufflingSound()
                        //send new state to server
                        socket.emit('updateGameState', {
                            gameOver: checkGameOver(player1Deck),
                            winner: checkWinner(player1Deck, 'Player 1'),
                            turn: 'Player 1',
                            playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card, ...playedCardsPile.slice(playedCardsPile.length)],
                            player1Deck: [...updatedPlayer1Deck],
                            currentColor: colorOfPlayedCard,
                            currentNumber: numberOfPlayedCard,
                            drawCardPile: [...copiedDrawCardPileArray]
                        })


                    } else {
                        //remove the played card from player2's deck and add it to playedCardsPile (immutably)
                        //then update turn, currentColor and currentNumber
                        const removeIndex = player2Deck.indexOf(played_card)
                        //if two cards remaining check if player pressed UNO button
                        //if not pressed add 2 cards as penalty
                        //make a copy of drawCardPile array
                        const copiedDrawCardPileArray = [...drawCardPile]
                        //pull out last two elements from it
                        const drawCard1 = numberOfPlayedCard + "R"
                        const drawCard2 = numberOfPlayedCard + "Y"
                        if (colorOfPlayedCard === "O") {
                            const drawCard1 = numberOfPlayedCard + "R"
                            const drawCard2 = numberOfPlayedCard + "Y"
                        } else if (colorOfPlayedCard === "P") {
                            const drawCard1 = numberOfPlayedCard + "R"
                            const drawCard2 = numberOfPlayedCard + "B"
                        } else if (colorOfPlayedCard === "G") {
                            const drawCard1 = numberOfPlayedCard + "Y"
                            const drawCard2 = numberOfPlayedCard + "B"
                        }
                        const updatedPlayer2Deck = [...player2Deck.slice(0, removeIndex), ...player2Deck.slice(removeIndex + 1)]
                        updatedPlayer2Deck.push(drawCard1)
                        updatedPlayer2Deck.push(drawCard2)
                        !isSoundMuted && playShufflingSound()
                        //send new state to server
                        socket.emit('updateGameState', {
                            gameOver: checkGameOver(player2Deck),
                            winner: checkWinner(player2Deck, 'Player 2'),
                            turn: 'Player 2',
                            playedCardsPile: [...playedCardsPile.slice(0, playedCardsPile.length), played_card, ...playedCardsPile.slice(playedCardsPile.length)],
                            player2Deck: [...updatedPlayer2Deck],
                            currentColor: colorOfPlayedCard,
                            currentNumber: numberOfPlayedCard,
                            drawCardPile: [...copiedDrawCardPileArray]
                        })


                    }

                    break;
                }
                case '3B':
                case '3R':
                case '1Y':
                case '1B':
                case '1R':
                case '2Y':
                case '2B':
                case '2R':
                case '3Y': {
                    alert("invalid move")
                }
                //if card played was a skip card

            }
        }
    }

    const onCardDrawnHandler = () => {
        //extract player who drew the card
        const cardDrawnBy = turn
        //check who drew the card and return new state accordingly
        if (cardDrawnBy === 'Player 1') {
            //remove 1 new card from drawCardPile and add it to player1's deck (immutably)
            //make a copy of drawCardPile array
            const copiedDrawCardPileArray = [...drawCardPile]
            //pull out last element from it
            const drawCard = copiedDrawCardPileArray.pop()
            //extract number and color of drawn card
            const colorOfDrawnCard = drawCard.charAt(drawCard.length - 1)
            let numberOfDrawnCard = drawCard.charAt(0)
            //else add the drawn card to player1's deck

            !isSoundMuted && playShufflingSound()
            //send new state to server
            socket.emit('updateGameState', {
                turn: 'Player 2',
                player1Deck: [...player1Deck.slice(0, player1Deck.length), drawCard, ...player1Deck.slice(player1Deck.length)],
                drawCardPile: [...copiedDrawCardPileArray]
            })
        } else {
            //remove 1 new card from drawCardPile and add it to player2's deck (immutably)
            //make a copy of drawCardPile array
            const copiedDrawCardPileArray = [...drawCardPile]
            //pull out last element from it
            const drawCard = copiedDrawCardPileArray.pop()
            //extract number and color of drawn card
            const colorOfDrawnCard = drawCard.charAt(drawCard.length - 1)
            let numberOfDrawnCard = drawCard.charAt(0)
            //else add the drawn card to player2's deck

            !isSoundMuted && playShufflingSound()
            //send new state to server
            socket.emit('updateGameState', {
                turn: 'Player 1',
                player2Deck: [...player2Deck.slice(0, player2Deck.length), drawCard, ...player2Deck.slice(player2Deck.length)],
                drawCardPile: [...copiedDrawCardPileArray]
            })

        }
    }

    return (
        <div className={`Game backgroundColorR backgroundColor${currentColor}`}>
            {(!roomFull) ? <>

                <div className='topInfo'>
                    <img src={require('../assets/logo.png').default}/>
                    <h1>Game Code: {room}</h1>
                    <span>
                        <button className='game-button green'
                                onClick={() => setSoundMuted(!isSoundMuted)}>{isSoundMuted ?
                            <span className="material-icons">volume_off</span> :
                            <span className="material-icons">volume_up</span>}</button>
                        <button className='game-button green' onClick={() => {
                            if (isMusicMuted)
                                playBBgMusic()
                            else
                                pause()
                            setMusicMuted(!isMusicMuted)
                        }}>{isMusicMuted ? <span className="material-icons">music_off</span> :
                            <span className="material-icons">music_note</span>}</button>
                    </span>
                </div>

                {/* PLAYER LEFT MESSAGES */}
                {users.length === 1 && currentUser === 'Player 2' &&
                <h1 className='topInfoText'>Player 1 has left the game.</h1>}
                {users.length === 1 && currentUser === 'Player 1' &&
                <h1 className='topInfoText'>Waiting for Player 2 to join the game.</h1>}

                {users.length === 2 && <>

                    {gameOver ? <div>{winner !== '' && <><h1>GAME OVER</h1><h2>{winner} wins!</h2></>}</div> :
                        <div>
                            {/* PLAYER 1 VIEW */}
                            {currentUser === 'Player 1' && <>
                                <div className='player2Deck' style={{pointerEvents: 'none'}}>
                                    <p className='playerDeckText'>Player 2</p>
                                    {player2Deck.map((item, i) => (
                                        <img
                                            key={i}
                                            className='Card'
                                            onClick={() => onCardPlayedHandler(item)}
                                            src={require(`../assets/card-back.png`).default}
                                        />
                                    ))}
                                    {turn === 'Player 2' && <Spinner/>}
                                </div>
                                <br/>
                                <div className='middleInfo'
                                     style={turn === 'Player 2' ? {pointerEvents: 'none'} : null}>
                                    <button className='game-button' disabled={turn !== 'Player 1'}
                                            onClick={onCardDrawnHandler}>DRAW CARD
                                    </button>
                                    {playedCardsPile && playedCardsPile.length > 0 &&
                                    <img
                                        className='Card'
                                        src={require(`../assets/cards-front/${playedCardsPile[playedCardsPile.length - 1]}.png`).default}
                                    />}
                                    {playerSynthesis[0]} {playerSynthesis[1]}
                                    <button className='game-button orange'
                                            onClick={() => {
                                                if (playerChoice[2] == playerChoice[3]) {
                                                    alert("invalid move")
                                                } else {
                                                    onCardPlayedHandler(playerChoice, 3)
                                                    console.log(playerChoice)
                                                    playUnoSound()
                                                }

                                            }}>fundC
                                    </button>
                                    <button className='game-button orange'
                                            onClick={() => {
                                                if (playerChoice[2] == playerChoice[3]) {
                                                    alert("invalid move")
                                                } else {
                                                    onCardPlayedHandler(playerChoice, 4)
                                                    console.log(playerChoice)
                                                    playUnoSound()
                                                }
                                            }}>fundS
                                    </button>
                                    <button className='game-button orange'
                                            onClick={() => {
                                                onCardPlayedHandler(playerChoice[0], 2)
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>refundS
                                    </button>

                                    <button className='game-button orange'
                                            onClick={() => {
                                                onCardPlayedHandler(playerChoice[0], 1)
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>refundC
                                    </button>
                                    <button className='game-button orange' disabled={player1Deck.length == 2}
                                            onClick={() => {
                                                EndofRound()
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>Turn
                                    </button>

                                </div>
                                <br/>
                                <div className='player1Deck'
                                     style={turn === 'Player 2' ? {pointerEvents: 'none'} : null}>
                                    <p className='playerDeckText'>Player 1</p>
                                    {player1Deck.map((item, i) => (
                                        <img
                                            key={i}
                                            className='Card'
                                            onClick={() => {
                                                playerSynthesis[1] = playerSynthesis[0]
                                                playerSynthesis[0] = item
                                                playerSynthesis[3] = playerSynthesis[2]
                                                playerSynthesis[2] = i
                                                setPlayerChoice(playerSynthesis)
                                                // setPlayerChoice(item)
                                            }}
                                            src={require(`../assets/cards-front/${item}.png`).default}
                                        />
                                    ))}
                                </div>

                                <div className="chatBoxWrapper">
                                    <div className="chat-box chat-box-player1">
                                        <div className="chat-head">
                                            <h2>Chat Box</h2>
                                            {!isChatBoxHidden ?
                                                <span onClick={toggleChatBox}
                                                      class="material-icons">keyboard_arrow_down</span> :
                                                <span onClick={toggleChatBox}
                                                      class="material-icons">keyboard_arrow_up</span>}
                                        </div>
                                        <div className="chat-body">
                                            <div className="msg-insert">
                                                {messages.map(msg => {
                                                    if (msg.user === 'Player 2')
                                                        return <div className="msg-receive">{msg.text}</div>
                                                    if (msg.user === 'Player 1')
                                                        return <div className="msg-send">{msg.text}</div>
                                                })}
                                            </div>
                                            <div className="chat-text">
                                                <input type='text' placeholder='Type a message...' value={message}
                                                       onChange={event => setMessage(event.target.value)}
                                                       onKeyPress={event => event.key === 'Enter' && sendMessage(event)}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>}

                            {/* PLAYER 2 VIEW */}
                            {currentUser === 'Player 2' && <>
                                <div className='player1Deck' style={{pointerEvents: 'none'}}>
                                    <p className='playerDeckText'>Player 1</p>
                                    {player1Deck.map((item, i) => (
                                        <img
                                            key={i}
                                            className='Card'
                                            onClick={() => onCardPlayedHandler(item)}
                                            src={require(`../assets/card-back.png`).default}
                                        />
                                    ))}
                                    {turn === 'Player 1' && <Spinner/>}
                                </div>
                                <br/>
                                <div className='middleInfo'
                                     style={turn === 'Player 1' ? {pointerEvents: 'none'} : null}>
                                    <button className='game-button' disabled={turn !== 'Player 2'}
                                            onClick={onCardDrawnHandler}>DRAW CARD
                                    </button>

                                    {playedCardsPile && playedCardsPile.length > 0 &&
                                    <img
                                        className='Card'
                                        src={require(`../assets/cards-front/1B.png`).default}
                                    />
                                    }
                                    {playerSynthesis[0]} {playerSynthesis[1]}
                                    <button className='game-button orange'
                                            onClick={() => {
                                                if (playerChoice[2] == playerChoice[3]) {
                                                    // make sure do not choice one card twice
                                                    alert("invalid move")
                                                } else {
                                                    onCardPlayedHandler(playerChoice, 3)
                                                    console.log(playerChoice)
                                                    playUnoSound()
                                                }

                                            }}>fundC
                                    </button>
                                    <button className='game-button orange'
                                            onClick={() => {
                                                onCardPlayedHandler(playerChoice, 4)
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>fundS
                                    </button>
                                    <button className='game-button orange'
                                            onClick={() => {
                                                onCardPlayedHandler(playerChoice[0], 2)
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>refundS
                                    </button>

                                    <button className='game-button orange'
                                            onClick={() => {
                                                onCardPlayedHandler(playerChoice[0], 1)
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>refundC
                                    </button>
                                    <button className='game-button orange' disabled={player2Deck.length == 2}
                                            onClick={() => {
                                                EndofRound()
                                                console.log(playerChoice)
                                                playUnoSound()
                                            }}>Turn
                                    </button>

                                </div>
                                <br/>
                                <div className='player2Deck'
                                     style={turn === 'Player 1' ? {pointerEvents: 'none'} : null}>
                                    <p className='playerDeckText'>Player 2</p>
                                    {player2Deck.map((item, i) => (
                                        <img
                                            key={i}
                                            className='Card'
                                            onClick={() => {
                                                playerSynthesis[1] = playerSynthesis[0]
                                                playerSynthesis[0] = item
                                                playerSynthesis[3] = playerSynthesis[2]
                                                playerSynthesis[2] = i
                                                setPlayerChoice(playerSynthesis)


                                                // setPlayerChoice(item)
                                            }}
                                            src={require(`../assets/cards-front/${item}.png`).default}
                                        />


                                    ))}
                                </div>

                                <div className="chatBoxWrapper">
                                    <div className="chat-box chat-box-player2">
                                        <div className="chat-head">
                                            <h2>Chat Box</h2>
                                            {!isChatBoxHidden ?
                                                <span onClick={toggleChatBox}
                                                      class="material-icons">keyboard_arrow_down</span> :
                                                <span onClick={toggleChatBox}
                                                      class="material-icons">keyboard_arrow_up</span>}
                                        </div>
                                        <div className="chat-body">
                                            <div className="msg-insert">
                                                {messages.map(msg => {
                                                    if (msg.user === 'Player 1')
                                                        return <div className="msg-receive">{msg.text}</div>
                                                    if (msg.user === 'Player 2')
                                                        return <div className="msg-send">{msg.text}</div>
                                                })}
                                            </div>
                                            <div className="chat-text">
                                                <input type='text' placeholder='Type a message...' value={message}
                                                       onChange={event => setMessage(event.target.value)}
                                                       onKeyPress={event => event.key === 'Enter' && sendMessage(event)}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>}
                        </div>}
                </>}
            </> : <h1>Room full</h1>}

            <br/>
            <a href='/'>
                <button className="game-button red">QUIT</button>
            </a>
        </div>
    )
}

export default Game