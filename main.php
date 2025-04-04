class LibraryDemonstration extends AbstractLibrary {
    private $name;
    private $location;
    
    public function __construct($name, $location) {
        $this->name = $name;
        $this->location = $location;
    }
    
    public function getName() {
        return $this->name;
    }
    
    public function getLocation() {
        return $this->location;
    }
    
    public function setName($name) {
        $this->name = $name;
    }
    
    public function setLocation($location) {
        $this->location = $location;
    }
}
