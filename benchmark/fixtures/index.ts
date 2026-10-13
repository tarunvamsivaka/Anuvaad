import fs from 'fs';
import path from 'path';
import { BenchmarkFixture } from '../types';

export const FIXTURE_REGISTRY: Array<Omit<BenchmarkFixture, 'code'>> = [
  {
    id: 'modal',
    name: 'Modal',
    repository: 'reactjs/react-modal',
    category: 'UI Overlays',
    sourceType: 'jsx',
    description: 'Modal dialog with escape key listener, lifecycle management, and portal overlay render.',
    expectedStateKeys: ['isOpen', 'hasOpenedBefore'],
    expectedLifecycles: ['componentDidMount', 'componentWillUnmount'],
  },
  {
    id: 'autocomplete',
    name: 'Autocomplete',
    repository: 'reactjs/react-autocomplete',
    category: 'Form Controls',
    sourceType: 'jsx',
    description: 'Combobox autocomplete with keyboard navigation, search filtering, and dropdown render.',
    expectedStateKeys: ['query', 'results', 'isOpen', 'highlightedIndex'],
    expectedLifecycles: ['componentDidMount', 'componentWillUnmount'],
  },
  {
    id: 'tabs',
    name: 'Tabs',
    repository: 'reactjs/react-tabs',
    category: 'Navigation',
    sourceType: 'jsx',
    description: 'Accessible tabs component with active tab tracking, componentDidUpdate syncing, and panel switching.',
    expectedStateKeys: ['selectedIndex', 'tabCount'],
    expectedLifecycles: ['componentDidMount', 'componentDidUpdate'],
  },
  {
    id: 'datepicker',
    name: 'DatePicker',
    repository: 'gpbl/react-day-picker',
    category: 'Date & Time Pickers',
    sourceType: 'jsx',
    description: 'Calendar date picker with month navigation, selection state, and popup toggling.',
    expectedStateKeys: ['selectedDate', 'currentMonth', 'currentYear', 'isCalendarOpen'],
    expectedLifecycles: ['componentDidMount'],
  },
  {
    id: 'router-link',
    name: 'RouterLink',
    repository: 'remix-run/react-router',
    category: 'Routing Architecture',
    sourceType: 'jsx',
    description: 'Router link element with active route detection and navigation event interception.',
    expectedStateKeys: ['isActive'],
    expectedLifecycles: ['componentDidMount', 'componentDidUpdate'],
  },
];

const FIXTURE_FILENAMES: Record<string, string> = {
  modal: 'Modal.jsx',
  autocomplete: 'Autocomplete.jsx',
  tabs: 'Tabs.jsx',
  datepicker: 'DatePicker.jsx',
  'router-link': 'RouterLink.jsx',
};

/**
 * Loads all curated React class component fixtures from disk
 */
export function loadAllFixtures(fixturesDir: string = __dirname): BenchmarkFixture[] {
  return FIXTURE_REGISTRY.map(entry => {
    const filename = FIXTURE_FILENAMES[entry.id] || `${entry.name}.jsx`;
    const filePath = path.join(fixturesDir, filename);
    let code = '';
    if (fs.existsSync(filePath)) {
      code = fs.readFileSync(filePath, 'utf-8');
    } else {
      throw new Error(`Fixture file not found: ${filePath}`);
    }
    return {
      ...entry,
      code,
    };
  });
}

/**
 * Loads a single fixture by ID
 */
export function getFixtureById(id: string, fixturesDir: string = __dirname): BenchmarkFixture | undefined {
  const all = loadAllFixtures(fixturesDir);
  return all.find(f => f.id === id);
}
