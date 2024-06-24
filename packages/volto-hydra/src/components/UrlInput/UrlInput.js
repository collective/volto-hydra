import React, { useState, useEffect } from 'react';
import { Dropdown, Icon } from 'semantic-ui-react';
import Cookies from 'js-cookie';
import './styles.css';

const UrlInput = ({ urls, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [value, setValue] = useState(Cookies.get('iframe_url') || '');
  const [urlList, setUrlList] = useState(urls);
  const handleDropdownChange = (e, { value, searchQuery }) => {
    setValue(value);
    setSearchQuery(value);
    onSelect(value);
  };

  useEffect(() => {
    setUrlList((prev) => (prev ? [...prev, ...urls] : urls));
  }, [urls]);

  const handleSearchChange = (e, { searchQuery }) => {
    setSearchQuery(searchQuery);
  };

  const handleOnAddItem = (e, { value }) => {
    setUrlList((prev) => (prev ? [...prev, value] : [value]));
  };
  const renderDropdown = () => {
    const dropdownOptions = urlList.map((url) => ({
      key: url,
      value: url,
      text: url,
    }));

    return (
      <Dropdown
        fluid
        selectOnNavigation={false}
        closeOnEscape
        allowAdditions
        options={dropdownOptions}
        placeholder="Enter URL or select preset"
        search
        searchQuery={searchQuery}
        selection
        value={value}
        onAddItem={handleOnAddItem}
        onChange={handleDropdownChange}
        onSearchChange={handleSearchChange}
      />
    );
  };

  return <div className="url-input-container">{renderDropdown()}</div>;
};

export default UrlInput;
