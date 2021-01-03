import logo from './logo.svg';
import './App.css';
import Papa from 'papaparse';
import { useEffect, useState, useMemo } from 'react';

function App() {
  const { sequences, loading } = useSequences();
  const loadingMessage = <p>Downloading OEIS Sequences...</p>;
  return (
    <div className="App">
      <header className="App-header">
        {loading ? loadingMessage : <Game sequences={sequences}/>}
      </header>
    </div>
  );
}

// const timer = makeTimer
function Game({ sequences }) {
  const randomSequences = useRandomChoose(sequences);
  const { choices: options, indices, rerandomize: rerandomizeSequences } = randomSequences;
  const aNumbers = useMemo(() => options.map(o => o[0].trim()), [options]);
  const correctIndex = useRandomChoose(indices, 1).choices[0];
  const sequence = sequences[correctIndex].slice(1).map(a => +a);
  const [sequenceHintLength, setSequenceHintLength] = useState(10);
  const sequenceHint = sequence.slice(0, sequenceHintLength);
  const { sequenceNames, loading } = useSequenceNames(aNumbers);
  const [ game, setGame ] = useState('which-sequence');
  const [ nextTerm, setNextTerm ] = useState(0);
  const [ answerIsCorrect, setAnswerIsCorrect ] = useState(null);
  const timer = useTimer();
  if (loading) {
    return <p>Downloading sequence names...</p>;
  }

  function onChooseGame(event) {
    const newGame = event.target.id;
    setGame(newGame);
    if (newGame === 'terms-within-time') {
      timer.reset(60);
      timer.start();
    }
  }

  function onTermChange(event) {
    const value = +event.target.value;
    if (Number.isNaN(value)) {
      return;
    }
    setNextTerm(value);
  }

  function onSubmitNextTerm() {
    const correctNextTerm = sequence[10];
    if (nextTerm === correctNextTerm) {
      setAnswerIsCorrect(true);
    } else {
      setAnswerIsCorrect(false);
    }
  }

  function resetGame() {
    setAnswerIsCorrect(null);
    rerandomizeSequences();
  }

  const games = {
    'which-sequence': <>
      <p>Sequence starts with: <strong>{sequenceHint.join(' ')}</strong></p>
      <ol>
        {aNumbers.map(a => {
          return sequenceNames[a] ? <li>{sequenceNames[a].name}<br />{sequenceNames[a].where}</li> : <li>Data missing (oops)</li>
        })}
      </ol>
    </>,
    'next-term': <>
      <p>Sequence starts with: <strong>{sequenceHint.join(' ')}</strong></p>
      <p>What's the next term?</p>
      <input onChange={onTermChange} default={0} value={nextTerm} />
      <button onClick={onSubmitNextTerm}>Submit Answer</button>
    </>,
    'terms-within-time': <>
      <p>Time left: {timer.timeLeft().toFixed(1)} seconds</p>
      <p>Sequence starts with: <strong>{sequenceHint.join(' ')}</strong></p>
      <p>What's the next term?</p>
      <input onChange={onTermChange} default={0} value={nextTerm} disabled={timer.timeLeft() <= 0} />
      <button onClick={onSubmitNextTerm} disabled={timer.timeLeft() <= 0}>Submit Answer</button>
    </>
  }

  const mainGameComponent = <>
    {games[game]}
    <input type='radio' name='game' id='next-term' onChange={onChooseGame} checked={game === 'next-term'}/>
    <label htmlFor='next-term'>Next Term Game</label>
    <input type='radio' name='game' id='which-sequence' onChange={onChooseGame} checked={game === 'which-sequence'} />
    <label htmlFor='which-sequence'>Guess the Sequence Game</label>
    <input type='radio' name='game' id='terms-within-time' onChange={onChooseGame} checked={game === 'terms-within-time'} />
    <label htmlFor='terms-within-time'>Guess Terms Within Time Limit Game</label>
  </>;

  if (answerIsCorrect !== null) {
    if (game === 'terms-within-time') {
      if (answerIsCorrect) {
        setSequenceHintLength(sequenceHintLength + 1);
      }
      return mainGameComponent;
    }
    return (
      <>
        <p>{answerIsCorrect ? 'Right Answer!' : 'Incorrect Answer'}</p>
        <button onClick={resetGame}>Next Question</button>
      </>
    );
  }

  return mainGameComponent;
}

function useSequences() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Papa.parse('/sequences.csv', {
      download: true,
      comments: true,
      chunk(results) {
        setSequences(s => s.concat(results.data));
      },
      complete() {
        setLoading(false);
      }
    });
  }, []);
  return { sequences, loading };
}

function useSequenceNames(aNumbers) {
  const [sequenceNames, setSequenceNames] = useState({});
  const [loading, setLoading] = useState(true);

  // console.log(aNumbers);
  useEffect(() => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    fetch('/oeis-sequence-names', { method: 'POST', body: JSON.stringify({ aNumbers }), headers }).then(response =>
      response.json()
    ).then(json => (setSequenceNames(json), setLoading(false)));
  }, [aNumbers, loading]);

  return { sequenceNames, loading };
}

function useRandomChoose(array, count = 4) {
  const [choices, setChoices] = useState(null);
  const [oldParams, setOldParams] = useState({ array, count });
  function rerandomize() {
    setChoices(randomChoose(array, count));
  }
  if (choices === null || array !== oldParams.array || count !== oldParams.count) {
    const c = randomChoose(array, count);
    setChoices(c);
    setOldParams({ array, count });
    return {...c, rerandomize};
  }
  return {
    ...choices,
    rerandomize
  };
}

function useTimer() {
  const [limit, setLimit] = useState(60);
  const [handle, setHandle] = useState(null);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  function tick(timestamp) {
    if (startTimestamp === null) {
      setStartTimestamp(timestamp);
    } else {
      setElapsedMilliseconds(timestamp - startTimestamp);
    }
  };
  const timer = {
    reset(seconds) {
      setLimit(seconds);
      if (handle !== null) {
        cancelAnimationFrame(handle);
        setHandle(null);
      }
      setStartTimestamp(null);
      setElapsedMilliseconds(0);
    },
    start() {
      setHandle(requestAnimationFrame(tick));
    },
    timeLeft() { return Math.max(limit - elapsedMilliseconds/1000, 0); }
  };
  if (handle !== null && timer.timeLeft() > 0) {
    requestAnimationFrame(tick);
  }

  return timer;
}

function randomChoose(array, count = 4) {
  const indices = [];
  while (indices.length < count) {
    const index = Math.floor(Math.random() * array.length);
    if (!indices.includes(index)) {
      indices.push(index);
    }
  }
  return { choices: indices.map(i => array[i]), indices };
}

export default App;
