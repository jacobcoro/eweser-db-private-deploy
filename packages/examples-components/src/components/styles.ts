import type { CSSProperties } from 'react';

export const styles: { [key: string]: CSSProperties } = {
  appRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0',
    color: 'white',
    backgroundColor: '#373d5e',
    minHeight: '100vh',
  },
  card: {
    backgroundColor: 'white',
    color: 'black',
    width: '400px',
    boxShadow: '4px 3px 5px 2px green',
    margin: '32px auto',
    padding: '32px',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  flexWrap: { display: 'flex', flexWrap: 'wrap', columnGap: '1rem' },
  editor: { width: '90%', minHeight: '150px' },
  login: {
    display: 'flex',
    flexDirection: 'column',
    width: '400px',
    rowGap: '0.5rem',
  },
  deleteButton: { position: 'absolute', top: 8, right: 8 },
  statusBar: {
    position: 'fixed',
    backgroundColor: 'rgb(255 255 255 / 90%)',
    bottom: '0',
    right: 0,
    left: 0,
    zIndex: 2,
    padding: '0 1rem',
    color: 'rgb(82 82 82)',
    display: 'flex',
    justifyContent: 'space-between',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    height: '100%',
    width: '100%',
  },
  modalContent: {
    position: 'relative',
    padding: '5rem',
    background: 'white',
    display: 'flex',
    flexWrap: 'wrap',
    overflowY: 'auto',
    maxHeight: '80vh',
  },
  modalCloseButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
  },
  borderedCard: {
    border: '1px solid black',
    padding: '1rem',
    margin: '1rem',
    cursor: 'pointer',
    color: 'black',
  },
};
