
// tslint:disable:interface-name

export interface ModuleDivision {
    /**
     * Items.
     */
    items: Item[];
}

interface BaseItem {
    /**
     * Item name.
     */
    name: string;

    /**
     * Item description.
     */
    description?: string;

    /**
     * Whether if this item is required to provide.
     */
    required?: boolean;

    /**
     * If true, this field indicates the item is marked as bundled by default.
     */
    default?: boolean;
}

interface SimpleItem extends BaseItem {
    /**
     * Entry to the module.
     */
    entry: string;
}

interface GroupItem extends BaseItem {
    /**
     * Options.
     */
    options: Array<{
        /**
         * Name of the option.
         */
        name: string;

        /**
         * Entry of the option.
         */
        entry: string;

        /**
         * Option description.
         */
        description?: string;
    }>;

    /**
     * Indicates the n-th option is selected by default if the item is marked as bundled.
     */
    defaultOption?: number;
}

type Item = SimpleItem | GroupItem;
