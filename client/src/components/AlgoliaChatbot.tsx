import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import './AlgoliaChatbot.css';

const searchClient = algoliasearch(
  'WPSL0M8DI6',
  'eff3bd3a003d3c023a20d02610ef3bc6'
);

const AGENT_ID = 'eac9ef83-0c74-4963-ad96-78d56e6deb3b';

export default function AlgoliaChatbot() {
  return (
    <InstantSearch 
      searchClient={searchClient} 
      indexName="tech_atlas_new"
    >
      <Chat agentId={AGENT_ID} />
    </InstantSearch>
  );
}
