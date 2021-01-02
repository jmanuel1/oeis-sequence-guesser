import logo from './logo.svg';
import './App.css';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';

function App() {
  const { sequences, loading } = useSequences();
  const loadingMessage = <p>Downloading OEIS Sequences...</p>;
  return (
    <div className="App">
      <header className="App-header">
        {loading ? loadingMessage : <Game sequences={sequences} />}
      </header>
    </div>
  );
}

function Game({ sequences }) {
  const randomSequences = useRandomChoose(sequences);
  const { choices: options, indices } = randomSequences;
  const aNumbers = options.map(o => o[0].trim());
  const correctIndex = useRandomChoose(indices, 1).choices[0];
  const sequence = sequences[correctIndex].slice(1);
  const sequenceHint = sequence.slice(0, 5);
  const { sequenceNames, loading } = useSequenceNames(aNumbers);
  if (loading) {
    return <p>Downloading sequence names...</p>;
  }

  return (
    <>
      <p>Sequence starts with: <strong>{sequenceHint.join(' ')}</strong></p>
      <ol>
        {aNumbers.map(a => <li>{sequenceNames[a]}</li>)}
      </ol>
    </>
  );
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

  console.log(aNumbers);

  useEffect(() => Papa.parse('/sequence-names.csv', {
    delimiter: ' ',
    download: true,
    comments: true,
    chunk(results) {
      setSequenceNames(s => {
        const copy = {...s};
        for (let row of results.data) {
          if (aNumbers.includes(row[0]))
            copy[row[0]] = row.slice(1).join(' ');
        }
        return copy;
      });
    },
    complete() {
      setSequenceNames(s => {
        const copy = {...s};
        for (let aNumber in copy) {
          copy[aNumber] = copy[aNumber].replace(/(A\d{6})/, m => `"${copy[m[1]]}"`);
        }
        setLoading(false);
        return copy;
      });
    }
  }), [aNumbers]);

  return { sequenceNames, loading };
}

function useRandomChoose(array, count = 4) {
  const [choices, setChoices] = useState(null);
  if (choices === null) {
    const c = randomChoose(array, count);
    setChoices(c);
    return c;
  }
  return choices;
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
