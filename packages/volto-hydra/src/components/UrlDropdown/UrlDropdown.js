import React from 'react';
import { Dropdown } from 'semantic-ui-react';

const UrlDropdown = ({ urls, onChange }) => {
  const options = urls.map((url) => ({
    key: url,
    value: url,
    text: url,
  }));

  return (
    <Dropdown
      placeholder="Select URL"
      fluid
      selection
      options={options}
      onChange={(event, { value }) => onChange(value)}
    />
  );
};

export default UrlDropdown;
