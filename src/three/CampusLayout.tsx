import React from 'react';
import { Building } from './Building';
import { AcademicBuilding } from './AcademicBuilding';
import { AdminBuilding } from './AdminBuilding';
import { ComplexRoad } from './ComplexRoad';
import { Road } from './Road';

import { BuildingData } from '../../types';

interface CampusLayoutProps {
    buildings: BuildingData[];
    roads: [number, number][]; // [x, z] coordinates for road tiles
}

export const CampusLayout: React.FC<CampusLayoutProps> = ({ buildings, roads }) => {
    return (
        <group>
            {/* Static Buildings */}
            {buildings.map((b, i) => {
                if (b.id === 'academic' || b.name.includes('ACADEMIC') || b.name.includes('CSE')) {
                    return <AcademicBuilding key={`building-${i}`} position={b.position} size={b.size} rotation={b.rotation} />;
                }
                if (b.id === 'admin' || b.name.includes('ADMIN')) {
                    return <AdminBuilding key={`building-${i}`} position={b.position} size={b.size} rotation={b.rotation} />;
                }
                return (
                    <Building
                        key={`building-${i}`}
                        id={b.id}
                        name={b.name}
                        type={b.type}
                        position={b.position}
                        size={b.size}
                        color={b.color}
                    />
                );
            })}

            {/* Static Roads */}
            {roads.map((r, i) => (
                <Road
                    key={`road-${i}`}
                    position={[r[0], 0, r[1]]}
                    size={[1, 1]}
                />
            ))}
        </group>
    );
};
