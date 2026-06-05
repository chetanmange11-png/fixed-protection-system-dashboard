import { useState, useMemo } from 'react';
import { where } from 'firebase/firestore';
import { useLiveSync } from './useLiveSync';

export function useHierarchy() {
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const { data: plants, loading: plantsLoading } = useLiveSync('PLANTS');

  const locationConstraints = useMemo(() => {
    return selectedPlantId ? [where('plantId', '==', selectedPlantId)] : null;
  }, [selectedPlantId]);

  const { data: locations, loading: locationsLoading } = useLiveSync(
    'LOCATIONS',
    locationConstraints
  );

  const systemConstraints = useMemo(() => {
    return selectedLocationId ? [where('locationId', '==', selectedLocationId)] : null;
  }, [selectedLocationId]);

  const { data: systems, loading: systemsLoading } = useLiveSync(
    'EQUIPMENT_TYPES',
    systemConstraints
  );

  const tagNumberConstraints = useMemo(() => {
    return selectedSystemId ? [where('equipmentTypeId', '==', selectedSystemId)] : null;
  }, [selectedSystemId]);

  const { data: tagNumbers, loading: tagNumbersLoading } = useLiveSync(
    'TAG_NUMBERS',
    tagNumberConstraints
  );

  const selectPlant = (id: string | null) => {
    setSelectedPlantId(id);
    setSelectedLocationId(null);
    setSelectedSystemId(null);
  };

  const selectLocation = (id: string | null) => {
    setSelectedLocationId(id);
    setSelectedSystemId(null);
  };

  const selectSystem = (id: string | null) => {
    setSelectedSystemId(id);
  };

  return {
    plants,
    locations,
    systems,
    tagNumbers,
    loaders: {
      plants: plantsLoading,
      locations: locationsLoading,
      systems: systemsLoading,
      tagNumbers: tagNumbersLoading,
    },
    selections: {
      selectedPlantId,
      selectedLocationId,
      selectedSystemId,
    },
    actions: {
      selectPlant,
      selectLocation,
      selectSystem,
    }
  };
}
