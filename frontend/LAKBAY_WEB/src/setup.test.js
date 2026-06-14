/**
 * @jest-environment jsdom
 */
const React = require('react');
const { render, screen } = require('@testing-library/react');
require('@testing-library/jest-dom');

const Header = ({ title }) => (
  React.createElement('header', null,
    React.createElement('h1', null, title)
  )
);

describe('Header Component', () => {
  it('should render the title correctly', () => {
    render(React.createElement(Header, { title: 'Lakbay Dashboard' }));
    expect(screen.getByRole('heading')).toHaveTextContent('Lakbay Dashboard');
  });
});
