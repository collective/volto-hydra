import React from 'react';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="welcome-container">
      <h1>Welcome to Project Hydra</h1>
      <p>
        A PoC to let you make decoupled fast frontends, separated from Volto and
        in any framework, yet still keep the Volto editing experience. It's a
        work in progress.
      </p>
      <p>
        Login below with <strong>hydraeditor</strong>{' '}
        <strong>hydraeditor</strong> to see the progress of the editor
        experience.
      </p>
      <p>You can try any of the following frontends:</p>
      <ul>
        <li>
          <a
            href="https://hydra-nextjs-frontend-git-production-max786s-projects.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://hydra-nextjs-frontend-git-production-max786s-projects.vercel.app/
          </a>
        </li>
      </ul>
      <p>Or create your own frontend and let us know if it was easy or not.</p>
      <p>
        The instructions and latest updates on what works and what doesn't are
        in the{' '}
        <a
          href="https://github.com/collective/volto-hydra"
          target="_blank"
          rel="noopener noreferrer"
        >
          Hydra README
        </a>
      </p>
    </div>
  );
};

export default HomePage;
