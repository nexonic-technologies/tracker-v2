import MasterDataListView from "@components/MasterData/MasterDataListView";
import MasterDataFormView from "@components/MasterData/MasterDataFormView";

export function createListPage(config) {
  return function ListPage() {
    return <MasterDataListView config={config} />;
  };
}

export function createFormPage(config) {
  return function FormPage() {
    return <MasterDataFormView config={config} />;
  };
}
