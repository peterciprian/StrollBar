import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
	selector: 'app-stage-location-map',
	standalone: true,
	template: '<div #map class="stage-location-map" role="application" aria-label="Stage location map"></div>',
	styleUrls: ['./stage-location-map.component.scss']
})
export class StageLocationMapComponent implements AfterViewInit, OnChanges, OnDestroy {
	@Input() latitude = 47.4979;
	@Input() longitude = 19.0402;
	@Input() readonly = false;
	@Output() locationSelected = new EventEmitter<{ latitude: number; longitude: number }>();
	@ViewChild('map') private mapElement?: ElementRef<HTMLDivElement>;
	private map: L.Map | null = null;
	private marker: L.Marker | null = null;
	private resizeObserver: ResizeObserver | null = null;

	ngAfterViewInit(): void {
		this.syncMap();
	}
	ngOnChanges(changes: SimpleChanges): void {
		if (changes['latitude'] || changes['longitude']) setTimeout(() => this.syncMap());
	}
	ngOnDestroy(): void {
		this.resizeObserver?.disconnect();
		this.map?.remove();
	}

	private syncMap(): void {
		if (!this.mapElement) return;
		const location: L.LatLngExpression = [this.latitude, this.longitude];
		if (!this.map) {
			this.map = L.map(this.mapElement.nativeElement, { dragging: !this.readonly, scrollWheelZoom: !this.readonly }).setView(location, 15);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
			this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
			this.resizeObserver.observe(this.mapElement.nativeElement);
			this.marker = L.marker(location, {
				draggable: !this.readonly,
				icon: L.divIcon({ className: 'stage-location-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
			}).addTo(this.map);
			if (!this.readonly) {
				this.map.on('click', (event: L.LeafletMouseEvent) => this.select(event.latlng.lat, event.latlng.lng));
				this.marker.on('dragend', () => {
					const position = this.marker?.getLatLng();
					if (position) this.select(position.lat, position.lng);
				});
			}
			this.refreshMapSize();
		} else {
			this.map.setView(location);
			this.marker?.setLatLng(location);
			this.map.invalidateSize();
		}
	}

	private refreshMapSize(): void {
		setTimeout(() => this.map?.invalidateSize({ pan: false }), 0);
		setTimeout(() => this.map?.invalidateSize({ pan: false }), 150);
	}

	private select(latitude: number, longitude: number): void {
		const selectedLocation: L.LatLngExpression = [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))];
		this.marker?.setLatLng(selectedLocation);
		this.map?.setView(selectedLocation, this.map.getZoom(), { animate: true });
		this.locationSelected.emit({ latitude: selectedLocation[0] as number, longitude: selectedLocation[1] as number });
	}
}
